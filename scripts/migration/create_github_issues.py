#!/usr/bin/env python3
"""
Create GitHub issues from parsed task data
Task: T158 - Build GitHub issue creator script
"""

import subprocess
import json
import sys
import time
from typing import List, Dict, Optional
from dataclasses import dataclass
from pathlib import Path

@dataclass
class Task:
    """Represents a task to be converted to a GitHub issue"""
    id: str
    description: str
    skills: List[str]
    owner: str
    status: str
    dependencies: List[str]
    priority: str
    hours: int

class GitHubIssueCreator:
    """Creates GitHub issues from tasks"""
    
    def __init__(self, repo: Optional[str] = None, project_name: Optional[str] = None, 
                 milestone: Optional[str] = None, dry_run: bool = False):
        self.repo = repo
        self.project_name = project_name
        self.milestone = milestone
        self.dry_run = dry_run
        self.task_to_issue_map = {}
        
        # Verify gh CLI is available
        if not self._check_gh_cli():
            raise RuntimeError("GitHub CLI (gh) is not installed or not authenticated")
    
    def _check_gh_cli(self) -> bool:
        """Check if gh CLI is installed and authenticated"""
        try:
            result = subprocess.run(['gh', 'auth', 'status'], 
                                    capture_output=True, text=True)
            return result.returncode == 0
        except FileNotFoundError:
            return False
    
    def create_issue(self, task: Task) -> Optional[int]:
        """Create a GitHub issue from a task"""
        # Build labels
        labels = []
        
        # Priority label
        labels.append(f"priority-{task.priority}")
        
        # Status label
        if task.status != 'done':  # Don't create issues for completed tasks
            labels.append(f"status-{task.status}")
        else:
            print(f"Skipping completed task {task.id}")
            return None
        
        # Skill labels
        for skill in task.skills:
            skill_label = f"skill-{skill.replace(' ', '-').replace('/', '-')}"
            labels.append(skill_label)
        
        # Agent label if assigned
        if task.owner and task.owner not in ["unassigned", "📋 unassigned", "-"]:
            # Clean up agent name
            agent_name = task.owner.replace('-agent', '')
            if agent_name == 'migration':
                agent_name = 'migration'
            labels.append(f"agent-{agent_name}")
        
        # Build issue body
        body = self._build_issue_body(task)
        
        # Build command
        cmd = ['gh', 'issue', 'create']
        cmd.extend(['--title', f"{task.id}: {task.description}"])
        cmd.extend(['--body', body])
        
        if labels:
            cmd.extend(['--label', ','.join(labels)])
        
        if self.milestone:
            cmd.extend(['--milestone', self.milestone])
        
        if self.repo:
            cmd.extend(['--repo', self.repo])
        
        # Add to project if specified
        # Note: This requires the project to be set up first
        if self.project_name:
            cmd.extend(['--project', self.project_name])
        
        if self.dry_run:
            print(f"\n[DRY RUN] Would create issue for {task.id}:")
            print(f"  Title: {task.id}: {task.description}")
            print(f"  Labels: {', '.join(labels)}")
            print(f"  Command: {' '.join(cmd)}")
            return None
        
        try:
            print(f"Creating issue for {task.id}: {task.description}...")
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                # Extract issue number from URL
                issue_url = result.stdout.strip()
                issue_num = int(issue_url.split('/')[-1])
                print(f"  ✓ Created issue #{issue_num}")
                
                # Store mapping
                self.task_to_issue_map[task.id] = issue_num
                
                # Small delay to avoid rate limiting
                time.sleep(0.5)
                
                return issue_num
            else:
                print(f"  ✗ Failed to create issue: {result.stderr}")
                return None
                
        except Exception as e:
            print(f"  ✗ Error creating issue: {e}")
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
            # Convert task IDs to issue references if we have mappings
            dep_lines = []
            for dep in task.dependencies:
                if dep in self.task_to_issue_map:
                    dep_lines.append(f"- Depends on: #{self.task_to_issue_map[dep]}")
                else:
                    dep_lines.append(f"- Depends on: {dep}")
            lines.extend(dep_lines)
        else:
            lines.append("None")
        
        lines.extend([
            "",
            "## Estimated Hours",
            f"{task.hours} hours",
            "",
            "## Status",
            f"Current status from board: {task.status}",
            "",
            "## Migration Notes",
            "This issue was automatically created from AGENTS_BOARD.md",
            f"Original owner: {task.owner}"
        ])
        
        return "\n".join(lines)
    
    def create_issues_batch(self, tasks: List[Task]) -> Dict[str, int]:
        """Create multiple issues, respecting dependencies"""
        # Sort tasks to handle dependencies
        sorted_tasks = self._sort_by_dependencies(tasks)
        
        created_count = 0
        failed_count = 0
        skipped_count = 0
        
        for task in sorted_tasks:
            if task.status == 'done':
                skipped_count += 1
                continue
                
            issue_num = self.create_issue(task)
            if issue_num:
                created_count += 1
            else:
                failed_count += 1
        
        print(f"\n=== Summary ===")
        print(f"Created: {created_count} issues")
        print(f"Failed: {failed_count} issues")
        print(f"Skipped: {skipped_count} completed tasks")
        
        return self.task_to_issue_map
    
    def _sort_by_dependencies(self, tasks: List[Task]) -> List[Task]:
        """Sort tasks so dependencies are created first"""
        # Create a map of task ID to task
        task_map = {task.id: task for task in tasks}
        
        # Perform topological sort
        sorted_tasks = []
        visited = set()
        temp_visited = set()
        
        def visit(task_id: str):
            if task_id in temp_visited:
                # Circular dependency
                return
            if task_id in visited:
                return
                
            temp_visited.add(task_id)
            
            task = task_map.get(task_id)
            if task:
                # Visit dependencies first
                for dep in task.dependencies:
                    if dep in task_map:  # Only if dependency is in our list
                        visit(dep)
                
                visited.add(task_id)
                sorted_tasks.append(task)
            
            temp_visited.remove(task_id)
        
        # Visit all tasks
        for task_id in task_map:
            if task_id not in visited:
                visit(task_id)
        
        return sorted_tasks
    
    def save_mapping(self, filepath: str):
        """Save task-to-issue mapping to file"""
        mapping_data = {
            "task_mappings": {
                task_id: {
                    "github_issue": issue_num,
                    "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                }
                for task_id, issue_num in self.task_to_issue_map.items()
            },
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
        
        with open(filepath, 'w') as f:
            json.dump(mapping_data, f, indent=2)
        
        print(f"Saved task mapping to {filepath}")


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Create GitHub issues from parsed tasks')
    parser.add_argument(
        'input_file',
        nargs='?',
        default='-',
        help='Input JSON file from parse_agents_board.py (default: stdin)'
    )
    parser.add_argument(
        '--repo',
        help='GitHub repository (owner/name)'
    )
    parser.add_argument(
        '--project',
        help='GitHub project name to add issues to'
    )
    parser.add_argument(
        '--milestone',
        help='Milestone to assign issues to'
    )
    parser.add_argument(
        '--mapping-file',
        default='.task_mappings.json',
        help='File to save task-to-issue mappings (default: .task_mappings.json)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be created without actually creating issues'
    )
    parser.add_argument(
        '--filter-status',
        help='Only create issues for tasks with this status'
    )
    parser.add_argument(
        '--filter-owner',
        help='Only create issues for tasks with this owner'
    )
    
    args = parser.parse_args()
    
    try:
        # Read input
        if args.input_file == '-':
            input_data = json.load(sys.stdin)
        else:
            with open(args.input_file, 'r') as f:
                input_data = json.load(f)
        
        # Convert to Task objects
        tasks = []
        for task_dict in input_data.get('tasks', []):
            task = Task(**task_dict)
            
            # Apply filters
            if args.filter_status and task.status != args.filter_status:
                continue
            if args.filter_owner and task.owner != args.filter_owner:
                continue
                
            tasks.append(task)
        
        if not tasks:
            print("No tasks to process after filtering")
            return
        
        print(f"Processing {len(tasks)} tasks...")
        
        # Create issue creator
        creator = GitHubIssueCreator(
            repo=args.repo,
            project_name=args.project,
            milestone=args.milestone,
            dry_run=args.dry_run
        )
        
        # Create issues
        mapping = creator.create_issues_batch(tasks)
        
        # Save mapping if not dry run
        if not args.dry_run and mapping:
            creator.save_mapping(args.mapping_file)
            
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()