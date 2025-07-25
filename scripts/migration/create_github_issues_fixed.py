#!/usr/bin/env python3
"""
Create GitHub issues from parsed board tasks - Fixed version
Only creates labels that exist in the repository
"""

import json
import sys
import subprocess
import time
import argparse
from typing import Dict, List, Optional
from dataclasses import dataclass
from collections import defaultdict

@dataclass
class Task:
    """Task data structure"""
    id: str
    description: str
    skills: List[str]
    owner: str
    status: str
    dependencies: List[str]
    priority: str
    hours: int

class GitHubIssueCreator:
    def __init__(self, dry_run: bool = False, repo: Optional[str] = None):
        self.dry_run = dry_run
        self.repo = repo
        self.task_to_issue_map: Dict[str, int] = {}
        self.created_count = 0
        self.failed_count = 0
        self.skipped_count = 0
        
    def create_issue(self, task: Task) -> Optional[int]:
        """Create a GitHub issue from a task"""
        # Skip completed tasks
        if task.status == 'done':
            print(f"Skipping completed task {task.id}")
            self.skipped_count += 1
            return None
            
        # Build labels - only use core labels that we know exist
        labels = []
        
        # Priority label
        if task.priority in ['P0', 'P1', 'P2']:
            labels.append(f"priority-{task.priority}")
        
        # Status label - map to valid statuses
        status_map = {
            'ready': 'ready',
            'assigned': 'assigned',
            'in-progress': 'in-progress',
            'blocked': 'blocked',
            'review': 'review',
            'unassigned': 'unassigned'
        }
        
        if task.status in status_map:
            labels.append(f"status-{status_map[task.status]}")
        
        # Agent label - fix formatting
        if task.owner and task.owner not in ["unassigned", "📋 unassigned", "-"]:
            # Map known agents
            agent_map = {
                'frontend-agent': 'frontend-agent',
                'backend-agent': 'backend-agent', 
                'infra-agent': 'infra-agent',
                'quality-agent': 'quality-agent',
                'docs-agent': 'docs-agent',
                'migration-agent': 'migration-agent',
                'orchestrator': 'orchestrator',
                'design-agent': 'design-agent',
                'systems-design-agent': 'systems-design-agent'
            }
            
            if task.owner in agent_map:
                labels.append(f"agent-{agent_map[task.owner]}")
        
        # Build issue body
        body = self._build_issue_body(task)
        
        # Build command
        cmd = ['gh', 'issue', 'create']
        cmd.extend(['--title', f"{task.id}: {task.description}"])
        cmd.extend(['--body', body])
        
        if labels:
            cmd.extend(['--label', ','.join(labels)])
        
        if self.repo:
            cmd.extend(['--repo', self.repo])
        
        if self.dry_run:
            print(f"\n[DRY RUN] Would create issue for {task.id}:")
            print(f"  Title: {task.id}: {task.description}")
            print(f"  Labels: {', '.join(labels)}")
            return None
        
        try:
            print(f"Creating issue for {task.id}: {task.description}...")
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                # Extract issue number from URL
                issue_url = result.stdout.strip()
                issue_num = int(issue_url.split('/')[-1])
                
                print(f"  ✓ Created issue #{issue_num}")
                self.created_count += 1
                
                # Update mapping
                self.task_to_issue_map[task.id] = issue_num
                self._update_mapping_file(task.id, issue_num)
                
                # Small delay to avoid rate limiting
                time.sleep(0.5)
                
                return issue_num
            else:
                print(f"  ✗ Failed: {result.stderr.strip()}")
                self.failed_count += 1
                return None
                
        except Exception as e:
            print(f"  ✗ Error: {e}")
            self.failed_count += 1
            return None
    
    def _build_issue_body(self, task: Task) -> str:
        """Build the issue body markdown"""
        lines = [
            "## Task Description",
            task.description,
            "",
            "## Original Task ID", 
            task.id,
            "",
            "## Skills Required",
            ", ".join(task.skills) if task.skills else "None specified",
            "",
            "## Dependencies"
        ]
        
        if task.dependencies:
            dep_lines = []
            for dep in task.dependencies:
                dep_lines.append(f"- {dep}")
            lines.extend(dep_lines)
        else:
            lines.append("None")
        
        lines.extend([
            "",
            "## Estimated Hours",
            str(task.hours),
            "",
            "---",
            "*Migrated from AGENTS_BOARD.md*"
        ])
        
        return '\n'.join(lines)
    
    def _update_mapping_file(self, task_id: str, issue_num: int):
        """Update the task mapping file"""
        mapping_file = '.task_mappings.json'
        
        try:
            # Load existing mappings
            try:
                with open(mapping_file, 'r') as f:
                    data = json.load(f)
            except FileNotFoundError:
                data = {"task_mappings": {}, "sync_status": {}}
            
            # Update mapping
            data["task_mappings"][task_id] = {
                "github_issue": issue_num,
                "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "last_synced": time.strftime("%Y-%m-%dT%H:%M:%SZ")
            }
            
            # Save updated mappings
            with open(mapping_file, 'w') as f:
                json.dump(data, f, indent=2)
                
        except Exception as e:
            print(f"Warning: Failed to update mapping file: {e}")

def main():
    parser = argparse.ArgumentParser(description='Create GitHub issues from parsed board tasks')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be created without creating')
    parser.add_argument('--repo', help='Repository (owner/name)')
    args = parser.parse_args()
    
    # Read tasks from stdin
    tasks_data = json.load(sys.stdin)
    tasks = []
    
    print(f"Processing {tasks_data['count']} tasks...")
    
    # Convert to Task objects
    for task_data in tasks_data['tasks']:
        task = Task(
            id=task_data['id'],
            description=task_data['description'],
            skills=task_data.get('skills', []),
            owner=task_data.get('owner', 'unassigned'),
            status=task_data.get('status', 'ready'),
            dependencies=task_data.get('dependencies', []),
            priority=task_data.get('priority', 'P2'),
            hours=task_data.get('hours', 0)
        )
        tasks.append(task)
    
    # Create issues
    creator = GitHubIssueCreator(dry_run=args.dry_run, repo=args.repo)
    
    # Sort tasks by dependencies to create in order
    for task in tasks:
        creator.create_issue(task)
    
    # Summary
    print(f"\n=== Summary ===")
    print(f"Created: {creator.created_count} issues")
    print(f"Failed: {creator.failed_count} issues") 
    print(f"Skipped: {creator.skipped_count} completed tasks")

if __name__ == '__main__':
    main()