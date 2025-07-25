#!/usr/bin/env python3
"""
Detect conflicts between board and GitHub
Part of the bidirectional sync system
"""

import json
import sys
from pathlib import Path
from typing import Dict, List, Tuple

class ConflictDetector:
    """Detects conflicts between board and GitHub data"""
    
    def __init__(self, board_file: str, mapping_file: str):
        self.board_file = Path(board_file)
        self.mapping_file = Path(mapping_file)
        
    def detect_conflicts(self, board_tasks: List[Dict], github_issues: List[Dict]) -> List[Dict]:
        """Detect conflicts between board and GitHub"""
        conflicts = []
        
        # Create lookup maps
        board_map = {t['id']: t for t in board_tasks}
        github_map = {i['number']: i for i in github_issues}
        
        # Load mappings
        mappings = {}
        if self.mapping_file.exists():
            with open(self.mapping_file, 'r') as f:
                data = json.load(f)
                mappings = data.get('task_mappings', {})
        
        # Check each mapping
        for task_id, mapping in mappings.items():
            issue_num = mapping.get('github_issue')
            
            # Check if task exists in board
            if task_id not in board_map:
                conflicts.append({
                    'type': 'missing_in_board',
                    'task_id': task_id,
                    'issue_number': issue_num,
                    'details': 'Task exists in mappings but not in board'
                })
                continue
            
            # Check if issue exists on GitHub
            if issue_num not in github_map:
                conflicts.append({
                    'type': 'missing_on_github',
                    'task_id': task_id,
                    'issue_number': issue_num,
                    'details': 'Issue exists in mappings but not on GitHub'
                })
                continue
            
            # Compare status
            board_task = board_map[task_id]
            github_issue = github_map[issue_num]
            
            if not self._status_matches(board_task, github_issue):
                conflicts.append({
                    'type': 'status_mismatch',
                    'task_id': task_id,
                    'issue_number': issue_num,
                    'board_status': board_task.get('status'),
                    'github_status': self._extract_github_status(github_issue),
                    'details': 'Status differs between board and GitHub'
                })
            
            # Compare assignee
            if not self._assignee_matches(board_task, github_issue):
                conflicts.append({
                    'type': 'assignee_mismatch',
                    'task_id': task_id,
                    'issue_number': issue_num,
                    'board_owner': board_task.get('owner'),
                    'github_assignee': self._extract_github_assignee(github_issue),
                    'details': 'Assignee differs between board and GitHub'
                })
        
        return conflicts
    
    def _status_matches(self, board_task: Dict, github_issue: Dict) -> bool:
        """Check if status matches between board and GitHub"""
        board_status = board_task.get('status', '').lower()
        github_status = self._extract_github_status(github_issue)
        
        # Normalize statuses
        status_map = {
            'ready': ['ready', 'open'],
            'assigned': ['assigned'],
            'in-progress': ['in-progress', 'in progress'],
            'blocked': ['blocked'],
            'review': ['review'],
            'done': ['done', 'closed']
        }
        
        for normalized, variants in status_map.items():
            if board_status in variants and github_status in variants:
                return True
        
        return False
    
    def _assignee_matches(self, board_task: Dict, github_issue: Dict) -> bool:
        """Check if assignee matches between board and GitHub"""
        board_owner = board_task.get('owner', '').lower()
        github_assignee = self._extract_github_assignee(github_issue).lower()
        
        # Handle unassigned cases
        if board_owner in ['unassigned', '📋 unassigned', '-'] and not github_assignee:
            return True
        
        # Direct match
        if board_owner == github_assignee:
            return True
        
        # Agent name variations
        if board_owner.replace('-agent', '') == github_assignee.replace('-agent', ''):
            return True
        
        return False
    
    def _extract_github_status(self, issue: Dict) -> str:
        """Extract status from GitHub issue"""
        if issue.get('state') == 'closed':
            return 'closed'
        
        # Check labels
        for label in issue.get('labels', []):
            if label.get('name', '').startswith('status-'):
                return label['name'].replace('status-', '')
        
        return 'open'
    
    def _extract_github_assignee(self, issue: Dict) -> str:
        """Extract assignee from GitHub issue"""
        assignees = issue.get('assignees', [])
        if assignees:
            return assignees[0].get('login', '')
        return ''


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Detect sync conflicts')
    parser.add_argument('--board-file', default='AGENTS_BOARD.md')
    parser.add_argument('--mapping-file', default='.task_mappings.json')
    
    args = parser.parse_args()
    
    # This would normally receive data from the sync script
    # For now, just show the structure
    print("Conflict detection ready")
    print(f"Board file: {args.board_file}")
    print(f"Mapping file: {args.mapping_file}")


if __name__ == '__main__':
    main()