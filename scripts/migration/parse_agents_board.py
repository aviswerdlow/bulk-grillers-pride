#!/usr/bin/env python3
"""
Parse AGENTS_BOARD.md and extract all tasks
Task: T157 - Develop board parser script
"""

import re
import json
import sys
from dataclasses import dataclass, asdict
from typing import List, Optional, Dict
from pathlib import Path

@dataclass
class Task:
    """Represents a task from the AGENTS_BOARD.md file"""
    id: str
    description: str
    skills: List[str]
    owner: str
    status: str
    dependencies: List[str]
    priority: str
    hours: int
    
    def to_dict(self) -> Dict:
        """Convert task to dictionary for JSON serialization"""
        return asdict(self)

class BoardParser:
    """Parser for AGENTS_BOARD.md file"""
    
    # Status emoji mappings
    STATUS_MAP = {
        '✅ assigned': 'assigned',
        '🏃 in-progress': 'in-progress',
        '⏸️ blocked': 'blocked',
        '✨ ready': 'ready',
        '✔️ done': 'done',
        '📋 unassigned': 'ready',
        'done': 'done'  # Handle plain text status
    }
    
    def __init__(self, board_path: str):
        self.board_path = Path(board_path)
        if not self.board_path.exists():
            raise FileNotFoundError(f"Board file not found: {board_path}")
    
    def parse(self) -> List[Task]:
        """Parse AGENTS_BOARD.md and extract all tasks"""
        with open(self.board_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Regex to match task rows in markdown tables
        # Matches: | T123 | Description | skills | owner | status | deps | priority | hours |
        task_pattern = r'\|\s*(T\d+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*(P\d)\s*\|\s*(\d+)\s*\|'
        
        tasks = []
        line_num = 0
        
        for line in content.split('\n'):
            line_num += 1
            match = re.match(task_pattern, line)
            if match:
                try:
                    task = Task(
                        id=match.group(1).strip(),
                        description=match.group(2).strip(),
                        skills=self._parse_skills(match.group(3).strip()),
                        owner=match.group(4).strip(),
                        status=self._parse_status(match.group(5).strip()),
                        dependencies=self._parse_dependencies(match.group(6).strip()),
                        priority=match.group(7).strip(),
                        hours=int(match.group(8).strip())
                    )
                    tasks.append(task)
                except (ValueError, IndexError) as e:
                    print(f"Warning: Failed to parse line {line_num}: {e}", file=sys.stderr)
        
        return tasks
    
    def _parse_skills(self, skills_str: str) -> List[str]:
        """Parse comma-separated skills string"""
        if not skills_str or skills_str == '-':
            return []
        # Split by comma and clean up each skill
        return [s.strip() for s in skills_str.split(',') if s.strip()]
    
    def _parse_dependencies(self, deps_str: str) -> List[str]:
        """Parse comma-separated dependencies string"""
        if not deps_str or deps_str == '-':
            return []
        # Split by comma and clean up each dependency
        deps = []
        for dep in deps_str.split(','):
            dep = dep.strip()
            if dep and dep != '-':
                # Handle both T123 and #123 formats
                if dep.startswith('#'):
                    deps.append(dep[1:])
                else:
                    deps.append(dep)
        return deps
    
    def _parse_status(self, status_str: str) -> str:
        """Convert emoji status to standard label"""
        # Try exact match first
        if status_str in self.STATUS_MAP:
            return self.STATUS_MAP[status_str]
        
        # Try to find status by checking if any emoji pattern is in the string
        for emoji_status, label_status in self.STATUS_MAP.items():
            if emoji_status.split()[0] in status_str:  # Check emoji part
                return label_status
        
        # Default to ready if no match
        print(f"Warning: Unknown status '{status_str}', defaulting to 'ready'", file=sys.stderr)
        return 'ready'
    
    def get_statistics(self, tasks: List[Task]) -> Dict:
        """Generate statistics about the parsed tasks"""
        stats = {
            'total_tasks': len(tasks),
            'by_status': {},
            'by_priority': {},
            'by_owner': {},
            'total_hours': sum(task.hours for task in tasks),
            'tasks_with_dependencies': len([t for t in tasks if t.dependencies])
        }
        
        # Count by status
        for task in tasks:
            stats['by_status'][task.status] = stats['by_status'].get(task.status, 0) + 1
            stats['by_priority'][task.priority] = stats['by_priority'].get(task.priority, 0) + 1
            stats['by_owner'][task.owner] = stats['by_owner'].get(task.owner, 0) + 1
        
        return stats


def main():
    """Main entry point for the parser"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Parse AGENTS_BOARD.md file')
    parser.add_argument(
        'board_file',
        nargs='?',
        default='AGENTS_BOARD.md',
        help='Path to AGENTS_BOARD.md file (default: AGENTS_BOARD.md)'
    )
    parser.add_argument(
        '-o', '--output',
        help='Output file for parsed tasks (default: stdout)'
    )
    parser.add_argument(
        '--stats',
        action='store_true',
        help='Include statistics in output'
    )
    parser.add_argument(
        '--filter-status',
        help='Filter tasks by status (e.g., ready, in-progress)'
    )
    parser.add_argument(
        '--filter-owner',
        help='Filter tasks by owner (e.g., migration-agent)'
    )
    parser.add_argument(
        '--filter-priority',
        help='Filter tasks by priority (e.g., P0, P1)'
    )
    parser.add_argument(
        '--pretty',
        action='store_true',
        help='Pretty print JSON output'
    )
    
    args = parser.parse_args()
    
    try:
        # Parse the board
        board_parser = BoardParser(args.board_file)
        tasks = board_parser.parse()
        
        # Apply filters if specified
        if args.filter_status:
            tasks = [t for t in tasks if t.status == args.filter_status]
        if args.filter_owner:
            tasks = [t for t in tasks if t.owner == args.filter_owner]
        if args.filter_priority:
            tasks = [t for t in tasks if t.priority == args.filter_priority]
        
        # Prepare output
        output = {
            'tasks': [task.to_dict() for task in tasks],
            'count': len(tasks)
        }
        
        if args.stats:
            output['statistics'] = board_parser.get_statistics(tasks)
        
        # Format output
        if args.pretty:
            json_output = json.dumps(output, indent=2, ensure_ascii=False)
        else:
            json_output = json.dumps(output, ensure_ascii=False)
        
        # Write output
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                f.write(json_output)
            print(f"Parsed {len(tasks)} tasks and saved to {args.output}")
        else:
            print(json_output)
            
    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error parsing board: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()