#!/usr/bin/env python3
"""
Manage task ID to GitHub issue mappings
Task: T162 - Build task ID mapping database
"""

import json
import sys
import os
from datetime import datetime
from typing import Dict, Optional, List
from pathlib import Path

class TaskMappingManager:
    """Manages the task ID to GitHub issue mapping database"""
    
    def __init__(self, mapping_file: str = '.task_mappings.json'):
        self.mapping_file = Path(mapping_file)
        self.mappings = self._load_mappings()
    
    def _load_mappings(self) -> Dict:
        """Load existing mappings or create new structure"""
        if self.mapping_file.exists():
            try:
                with open(self.mapping_file, 'r') as f:
                    return json.load(f)
            except json.JSONDecodeError:
                print(f"Warning: Invalid JSON in {self.mapping_file}, creating new", file=sys.stderr)
        
        # Default structure
        return {
            "task_mappings": {},
            "sync_status": {
                "last_board_to_github": None,
                "last_github_to_board": None,
                "conflicts": []
            },
            "metadata": {
                "created_at": datetime.utcnow().isoformat() + 'Z',
                "version": "1.0"
            }
        }
    
    def save_mappings(self):
        """Save mappings to file"""
        # Create backup
        if self.mapping_file.exists():
            backup_file = self.mapping_file.with_suffix('.json.backup')
            self.mapping_file.rename(backup_file)
        
        # Save with pretty formatting
        with open(self.mapping_file, 'w') as f:
            json.dump(self.mappings, f, indent=2, sort_keys=True)
    
    def add_mapping(self, task_id: str, issue_number: int, metadata: Optional[Dict] = None):
        """Add or update a task to issue mapping"""
        mapping = {
            "github_issue": issue_number,
            "last_sync": datetime.utcnow().isoformat() + 'Z'
        }
        
        if metadata:
            mapping.update(metadata)
        
        self.mappings["task_mappings"][task_id] = mapping
        print(f"Added mapping: {task_id} -> Issue #{issue_number}")
    
    def get_issue_for_task(self, task_id: str) -> Optional[int]:
        """Get GitHub issue number for a task ID"""
        mapping = self.mappings["task_mappings"].get(task_id)
        if mapping:
            return mapping.get("github_issue")
        return None
    
    def get_task_for_issue(self, issue_number: int) -> Optional[str]:
        """Get task ID for a GitHub issue number"""
        for task_id, mapping in self.mappings["task_mappings"].items():
            if mapping.get("github_issue") == issue_number:
                return task_id
        return None
    
    def remove_mapping(self, task_id: str):
        """Remove a task mapping"""
        if task_id in self.mappings["task_mappings"]:
            del self.mappings["task_mappings"][task_id]
            print(f"Removed mapping for {task_id}")
        else:
            print(f"No mapping found for {task_id}")
    
    def list_mappings(self, format: str = "table"):
        """List all mappings"""
        if not self.mappings["task_mappings"]:
            print("No mappings found")
            return
        
        if format == "json":
            print(json.dumps(self.mappings["task_mappings"], indent=2))
        else:
            # Table format
            print(f"{'Task ID':<10} {'Issue #':<10} {'Last Sync':<25}")
            print("-" * 50)
            for task_id, mapping in sorted(self.mappings["task_mappings"].items()):
                issue = mapping.get("github_issue", "?")
                last_sync = mapping.get("last_sync", "Unknown")
                print(f"{task_id:<10} {issue:<10} {last_sync:<25}")
    
    def add_conflict(self, task_id: str, conflict_type: str, details: str):
        """Record a sync conflict"""
        conflict = {
            "task_id": task_id,
            "type": conflict_type,
            "details": details,
            "timestamp": datetime.utcnow().isoformat() + 'Z'
        }
        
        # Keep only last 100 conflicts
        self.mappings["sync_status"]["conflicts"] = \
            self.mappings["sync_status"]["conflicts"][-99:] + [conflict]
    
    def get_conflicts(self, task_id: Optional[str] = None) -> List[Dict]:
        """Get sync conflicts, optionally filtered by task ID"""
        conflicts = self.mappings["sync_status"]["conflicts"]
        
        if task_id:
            return [c for c in conflicts if c.get("task_id") == task_id]
        return conflicts
    
    def clear_conflicts(self, task_id: Optional[str] = None):
        """Clear conflicts, optionally for a specific task"""
        if task_id:
            self.mappings["sync_status"]["conflicts"] = [
                c for c in self.mappings["sync_status"]["conflicts"]
                if c.get("task_id") != task_id
            ]
            print(f"Cleared conflicts for {task_id}")
        else:
            self.mappings["sync_status"]["conflicts"] = []
            print("Cleared all conflicts")
    
    def get_statistics(self) -> Dict:
        """Get mapping statistics"""
        task_count = len(self.mappings["task_mappings"])
        conflict_count = len(self.mappings["sync_status"]["conflicts"])
        
        # Find unmapped issues (would need GitHub data)
        stats = {
            "total_mappings": task_count,
            "total_conflicts": conflict_count,
            "last_board_sync": self.mappings["sync_status"].get("last_board_to_github"),
            "last_github_sync": self.mappings["sync_status"].get("last_github_to_board")
        }
        
        return stats
    
    def validate_mappings(self, board_tasks: Optional[List[str]] = None,
                         github_issues: Optional[List[int]] = None) -> Dict:
        """Validate mappings against actual data"""
        validation = {
            "valid": True,
            "errors": [],
            "warnings": []
        }
        
        # Check for orphaned mappings
        for task_id, mapping in self.mappings["task_mappings"].items():
            if board_tasks and task_id not in board_tasks:
                validation["warnings"].append(f"Task {task_id} not found in board")
            
            issue_num = mapping.get("github_issue")
            if github_issues and issue_num not in github_issues:
                validation["warnings"].append(f"Issue #{issue_num} not found on GitHub")
        
        # Check for duplicate issue mappings
        issue_counts = {}
        for task_id, mapping in self.mappings["task_mappings"].items():
            issue_num = mapping.get("github_issue")
            if issue_num:
                if issue_num in issue_counts:
                    validation["errors"].append(
                        f"Issue #{issue_num} mapped to multiple tasks: "
                        f"{issue_counts[issue_num]} and {task_id}"
                    )
                    validation["valid"] = False
                issue_counts[issue_num] = task_id
        
        return validation


def main():
    """CLI interface for mapping manager"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Manage task ID mappings')
    parser.add_argument('--mapping-file', default='.task_mappings.json',
                       help='Path to mapping file')
    
    subparsers = parser.add_subparsers(dest='command', help='Commands')
    
    # Add mapping
    add_parser = subparsers.add_parser('add', help='Add a mapping')
    add_parser.add_argument('task_id', help='Task ID (e.g., T123)')
    add_parser.add_argument('issue_number', type=int, help='GitHub issue number')
    
    # Remove mapping
    remove_parser = subparsers.add_parser('remove', help='Remove a mapping')
    remove_parser.add_argument('task_id', help='Task ID to remove')
    
    # Get mapping
    get_parser = subparsers.add_parser('get', help='Get mapping for task or issue')
    get_parser.add_argument('identifier', help='Task ID or issue number')
    
    # List mappings
    list_parser = subparsers.add_parser('list', help='List all mappings')
    list_parser.add_argument('--format', choices=['table', 'json'], default='table',
                           help='Output format')
    
    # Show statistics
    stats_parser = subparsers.add_parser('stats', help='Show mapping statistics')
    
    # Validate mappings
    validate_parser = subparsers.add_parser('validate', help='Validate mappings')
    
    # Manage conflicts
    conflicts_parser = subparsers.add_parser('conflicts', help='Manage conflicts')
    conflicts_parser.add_argument('--clear', action='store_true', help='Clear conflicts')
    conflicts_parser.add_argument('--task', help='Filter by task ID')
    
    args = parser.parse_args()
    
    # Create manager
    manager = TaskMappingManager(args.mapping_file)
    
    try:
        if args.command == 'add':
            manager.add_mapping(args.task_id, args.issue_number)
            manager.save_mappings()
        
        elif args.command == 'remove':
            manager.remove_mapping(args.task_id)
            manager.save_mappings()
        
        elif args.command == 'get':
            # Try as task ID first
            if args.identifier.startswith('T'):
                issue = manager.get_issue_for_task(args.identifier)
                if issue:
                    print(f"{args.identifier} -> Issue #{issue}")
                else:
                    print(f"No mapping found for {args.identifier}")
            else:
                # Try as issue number
                try:
                    issue_num = int(args.identifier)
                    task = manager.get_task_for_issue(issue_num)
                    if task:
                        print(f"Issue #{issue_num} -> {task}")
                    else:
                        print(f"No mapping found for Issue #{issue_num}")
                except ValueError:
                    print("Invalid identifier")
        
        elif args.command == 'list':
            manager.list_mappings(args.format)
        
        elif args.command == 'stats':
            stats = manager.get_statistics()
            print("Mapping Statistics:")
            print(f"  Total mappings: {stats['total_mappings']}")
            print(f"  Total conflicts: {stats['total_conflicts']}")
            print(f"  Last board sync: {stats['last_board_sync'] or 'Never'}")
            print(f"  Last GitHub sync: {stats['last_github_sync'] or 'Never'}")
        
        elif args.command == 'validate':
            validation = manager.validate_mappings()
            print(f"Validation: {'PASSED' if validation['valid'] else 'FAILED'}")
            if validation['errors']:
                print("\nErrors:")
                for error in validation['errors']:
                    print(f"  - {error}")
            if validation['warnings']:
                print("\nWarnings:")
                for warning in validation['warnings']:
                    print(f"  - {warning}")
        
        elif args.command == 'conflicts':
            if args.clear:
                manager.clear_conflicts(args.task)
                manager.save_mappings()
            else:
                conflicts = manager.get_conflicts(args.task)
                if conflicts:
                    print(f"Found {len(conflicts)} conflicts:")
                    for conflict in conflicts:
                        print(f"\n{conflict['timestamp']} - {conflict['task_id']}")
                        print(f"  Type: {conflict['type']}")
                        print(f"  Details: {conflict['details']}")
                else:
                    print("No conflicts found")
        
        else:
            parser.print_help()
            
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()