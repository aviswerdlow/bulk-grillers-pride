#!/usr/bin/env python3
"""
Update AGENTS_BOARD.md from GitHub Issues
Part of T159 - Create bidirectional sync system
"""

import json
import sys
import re
from typing import Dict, List, Optional, Tuple
from pathlib import Path
from datetime import datetime

class BoardUpdater:
    """Updates AGENTS_BOARD.md with data from GitHub Issues"""
    
    # GitHub status to board emoji mapping
    STATUS_MAP = {
        'open': {
            'ready': '✨ ready',
            'assigned': '✅ assigned',
            'in-progress': '🏃 in-progress',
            'blocked': '⏸️ blocked',
            'review': '📋 review'
        },
        'closed': '✔️ done'
    }
    
    def __init__(self, board_file: str, mapping_file: str):
        self.board_file = Path(board_file)
        self.mapping_file = Path(mapping_file)
        self.mappings = self._load_mappings()
        self.issue_to_task_map = self._create_reverse_mapping()
        
    def _load_mappings(self) -> Dict:
        """Load task-to-issue mappings"""
        if self.mapping_file.exists():
            with open(self.mapping_file, 'r') as f:
                return json.load(f)
        return {"task_mappings": {}, "sync_status": {}}
    
    def _create_reverse_mapping(self) -> Dict[int, str]:
        """Create issue number to task ID mapping"""
        reverse_map = {}
        for task_id, mapping in self.mappings.get('task_mappings', {}).items():
            if 'github_issue' in mapping:
                reverse_map[mapping['github_issue']] = task_id
        return reverse_map
    
    def parse_github_issue(self, issue: Dict) -> Optional[Dict]:
        """Parse GitHub issue JSON into task data"""
        # Extract task ID from title or mapping
        task_id = None
        title = issue.get('title', '')
        
        # Try to extract from title (T123: Description)
        title_match = re.match(r'(T\d+):\s*(.+)', title)
        if title_match:
            task_id = title_match.group(1)
            description = title_match.group(2)
        else:
            # Try to find in mapping
            issue_num = issue.get('number')
            if issue_num in self.issue_to_task_map:
                task_id = self.issue_to_task_map[issue_num]
                description = title
            else:
                # Skip issues without task IDs
                return None
        
        # Extract labels
        labels = issue.get('labels', [])
        
        # Get status
        status = self._extract_status(issue, labels)
        
        # Get priority
        priority = self._extract_priority(labels)
        
        # Get owner/agent
        owner = self._extract_owner(issue, labels)
        
        # Get skills
        skills = self._extract_skills(labels)
        
        # Get estimated hours from body
        hours = self._extract_hours(issue.get('body', ''))
        
        # Get dependencies from body
        dependencies = self._extract_dependencies(issue.get('body', ''))
        
        return {
            'id': task_id,
            'description': description,
            'skills': skills,
            'owner': owner,
            'status': status,
            'dependencies': dependencies,
            'priority': priority,
            'hours': hours,
            'issue_number': issue.get('number')
        }
    
    def _extract_status(self, issue: Dict, labels: List[Dict]) -> str:
        """Extract status from issue state and labels"""
        if issue.get('state') == 'closed':
            return self.STATUS_MAP['closed']
        
        # Find status label
        for label in labels:
            label_name = label.get('name', '')
            if label_name.startswith('status-'):
                status_key = label_name.replace('status-', '')
                return self.STATUS_MAP['open'].get(status_key, '✨ ready')
        
        return '✨ ready'
    
    def _extract_priority(self, labels: List[Dict]) -> str:
        """Extract priority from labels"""
        for label in labels:
            label_name = label.get('name', '')
            if label_name.startswith('priority-'):
                return label_name.replace('priority-', '')
        return 'P2'  # Default priority
    
    def _extract_owner(self, issue: Dict, labels: List[Dict]) -> str:
        """Extract owner from assignees or agent labels"""
        # Check assignees first
        assignees = issue.get('assignees', [])
        if assignees:
            # Use first assignee
            return assignees[0].get('login', 'unassigned')
        
        # Check agent labels
        for label in labels:
            label_name = label.get('name', '')
            if label_name.startswith('agent-'):
                agent = label_name.replace('agent-', '')
                return f"{agent}-agent"
        
        return '📋 unassigned'
    
    def _extract_skills(self, labels: List[Dict]) -> List[str]:
        """Extract skills from labels"""
        skills = []
        for label in labels:
            label_name = label.get('name', '')
            if label_name.startswith('skill-'):
                skill = label_name.replace('skill-', '').replace('-', ' ')
                skills.append(skill)
        return skills
    
    def _extract_hours(self, body: str) -> int:
        """Extract estimated hours from issue body"""
        if not body:
            return 1
        
        # Look for "Estimated Hours" section
        hours_match = re.search(r'Estimated Hours[:\s]+(\d+)', body, re.IGNORECASE)
        if hours_match:
            return int(hours_match.group(1))
        
        return 1  # Default
    
    def _extract_dependencies(self, body: str) -> List[str]:
        """Extract dependencies from issue body"""
        if not body:
            return []
        
        deps = []
        
        # Look for depends on patterns
        dep_patterns = [
            r'Depends on:\s*#(\d+)',
            r'Depends on:\s*(T\d+)',
            r'Dependencies:.*?(?:T\d+|#\d+)'
        ]
        
        for pattern in dep_patterns:
            matches = re.findall(pattern, body, re.IGNORECASE | re.MULTILINE)
            for match in matches:
                if match.startswith('#'):
                    # Convert issue number to task ID if we have mapping
                    issue_num = int(match[1:])
                    if issue_num in self.issue_to_task_map:
                        deps.append(self.issue_to_task_map[issue_num])
                else:
                    deps.append(match)
        
        return list(set(deps))  # Remove duplicates
    
    def update_board(self, github_issues: List[Dict]) -> Tuple[int, int]:
        """Update AGENTS_BOARD.md with GitHub issue data"""
        # Read current board
        with open(self.board_file, 'r', encoding='utf-8') as f:
            board_content = f.read()
        
        updated_count = 0
        conflict_count = 0
        
        # Process each issue
        for issue in github_issues:
            task_data = self.parse_github_issue(issue)
            if not task_data:
                continue
            
            # Find and update task in board
            old_pattern = rf'\|\s*{re.escape(task_data["id"])}\s*\|[^|]+\|[^|]+\|[^|]+\|[^|]+\|[^|]+\|[^|]+\|[^|]+\|'
            
            # Build new row
            skills_str = ', '.join(task_data['skills']) if task_data['skills'] else '-'
            deps_str = ', '.join(task_data['dependencies']) if task_data['dependencies'] else '-'
            
            new_row = f"| {task_data['id']} | {task_data['description']} | {skills_str} | {task_data['owner']} | {task_data['status']} | {deps_str} | {task_data['priority']} | {task_data['hours']} |"
            
            # Check if task exists in board
            if re.search(old_pattern, board_content):
                # Update existing task
                board_content = re.sub(old_pattern, new_row, board_content)
                updated_count += 1
            else:
                # Task doesn't exist in board - potential conflict
                print(f"Warning: Task {task_data['id']} (Issue #{task_data['issue_number']}) not found in board", file=sys.stderr)
                conflict_count += 1
        
        # Write updated board
        with open(self.board_file, 'w', encoding='utf-8') as f:
            f.write(board_content)
        
        # Update mappings with sync info
        self._update_sync_status(updated_count, conflict_count)
        
        return updated_count, conflict_count
    
    def _update_sync_status(self, updated: int, conflicts: int):
        """Update sync status in mapping file"""
        self.mappings['sync_status']['last_github_to_board'] = datetime.utcnow().isoformat() + 'Z'
        self.mappings['sync_status']['last_update_count'] = updated
        self.mappings['sync_status']['last_conflict_count'] = conflicts
        
        with open(self.mapping_file, 'w') as f:
            json.dump(self.mappings, f, indent=2)


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Update AGENTS_BOARD.md from GitHub Issues')
    parser.add_argument('--board-file', default='AGENTS_BOARD.md', help='Path to board file')
    parser.add_argument('--mapping-file', default='.task_mappings.json', help='Path to mapping file')
    
    args = parser.parse_args()
    
    try:
        # Read GitHub issues from stdin
        issues = []
        for line in sys.stdin:
            line = line.strip()
            if line:
                try:
                    issue = json.loads(line)
                    issues.append(issue)
                except json.JSONDecodeError:
                    continue
        
        if not issues:
            print("No issues to process")
            return
        
        print(f"Processing {len(issues)} issues...")
        
        # Update board
        updater = BoardUpdater(args.board_file, args.mapping_file)
        updated, conflicts = updater.update_board(issues)
        
        print(f"Updated {updated} tasks in board")
        if conflicts > 0:
            print(f"Found {conflicts} conflicts")
            
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()