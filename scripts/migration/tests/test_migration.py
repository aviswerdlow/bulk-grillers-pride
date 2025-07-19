#!/usr/bin/env python3
"""
Unit tests for migration scripts
Task: T163 - Write unit tests for migration scripts
"""

import unittest
import json
import tempfile
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from parse_agents_board import BoardParser, Task
from manage_task_mappings import TaskMappingManager

class TestBoardParser(unittest.TestCase):
    """Test the AGENTS_BOARD.md parser"""
    
    def setUp(self):
        """Create a test board file"""
        self.test_board = tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False)
        self.test_board.write("""# Multi-Agent Task Board

## Tasks

| ID | Task | Skills | Owner | Status | Dependencies | Priority | Hours |
|---|---|---|---|---|---|---|---|
| T1 | Setup project | typescript, react | frontend-agent | ✅ assigned | - | P0 | 4 |
| T2 | Create API endpoints | convex, api | backend-agent | 🏃 in-progress | T1 | P1 | 6 |
| T3 | Write tests | jest, testing | quality-agent | ✨ ready | T1, T2 | P1 | 3 |
| T4 | Deploy to production | ci-cd, docker | infra-agent | ⏸️ blocked | T3 | P0 | 2 |
| T5 | Update documentation | markdown | docs-agent | ✔️ done | - | P2 | 1 |
| T6 | Fix bug | debugging | 📋 unassigned | - | P0 | 2 |
""")
        self.test_board.close()
        self.parser = BoardParser(self.test_board.name)
    
    def tearDown(self):
        """Clean up test files"""
        os.unlink(self.test_board.name)
    
    def test_parse_tasks(self):
        """Test parsing tasks from board"""
        tasks = self.parser.parse()
        
        self.assertEqual(len(tasks), 6)
        
        # Check first task
        task1 = tasks[0]
        self.assertEqual(task1.id, 'T1')
        self.assertEqual(task1.description, 'Setup project')
        self.assertEqual(task1.skills, ['typescript', 'react'])
        self.assertEqual(task1.owner, 'frontend-agent')
        self.assertEqual(task1.status, 'assigned')
        self.assertEqual(task1.dependencies, [])
        self.assertEqual(task1.priority, 'P0')
        self.assertEqual(task1.hours, 4)
    
    def test_parse_status_mapping(self):
        """Test status emoji to label mapping"""
        tasks = self.parser.parse()
        
        status_map = {
            'T1': 'assigned',
            'T2': 'in-progress',
            'T3': 'ready',
            'T4': 'blocked',
            'T5': 'done',
            'T6': 'ready'  # unassigned maps to ready
        }
        
        for task in tasks:
            expected_status = status_map[task.id]
            self.assertEqual(task.status, expected_status, 
                           f"Task {task.id} should have status {expected_status}")
    
    def test_parse_dependencies(self):
        """Test parsing task dependencies"""
        tasks = self.parser.parse()
        task_dict = {t.id: t for t in tasks}
        
        self.assertEqual(task_dict['T1'].dependencies, [])
        self.assertEqual(task_dict['T2'].dependencies, ['T1'])
        self.assertEqual(task_dict['T3'].dependencies, ['T1', 'T2'])
        self.assertEqual(task_dict['T4'].dependencies, ['T3'])
    
    def test_parse_skills(self):
        """Test parsing comma-separated skills"""
        tasks = self.parser.parse()
        task_dict = {t.id: t for t in tasks}
        
        self.assertEqual(task_dict['T1'].skills, ['typescript', 'react'])
        self.assertEqual(task_dict['T2'].skills, ['convex', 'api'])
        self.assertEqual(task_dict['T5'].skills, ['markdown'])
    
    def test_get_statistics(self):
        """Test statistics generation"""
        tasks = self.parser.parse()
        stats = self.parser.get_statistics(tasks)
        
        self.assertEqual(stats['total_tasks'], 6)
        self.assertEqual(stats['total_hours'], 18)
        self.assertEqual(stats['tasks_with_dependencies'], 3)
        
        # Check status counts
        self.assertEqual(stats['by_status']['assigned'], 1)
        self.assertEqual(stats['by_status']['in-progress'], 1)
        self.assertEqual(stats['by_status']['ready'], 2)
        self.assertEqual(stats['by_status']['blocked'], 1)
        self.assertEqual(stats['by_status']['done'], 1)
        
        # Check priority counts
        self.assertEqual(stats['by_priority']['P0'], 3)
        self.assertEqual(stats['by_priority']['P1'], 2)
        self.assertEqual(stats['by_priority']['P2'], 1)


class TestTaskMappingManager(unittest.TestCase):
    """Test the task mapping database manager"""
    
    def setUp(self):
        """Create test mapping file"""
        self.test_mapping = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
        self.test_mapping.close()
        self.manager = TaskMappingManager(self.test_mapping.name)
    
    def tearDown(self):
        """Clean up test files"""
        os.unlink(self.test_mapping.name)
    
    def test_add_mapping(self):
        """Test adding task to issue mappings"""
        self.manager.add_mapping('T1', 123)
        self.manager.add_mapping('T2', 456, {'extra': 'metadata'})
        
        self.assertEqual(self.manager.get_issue_for_task('T1'), 123)
        self.assertEqual(self.manager.get_issue_for_task('T2'), 456)
        
        # Check metadata
        mapping = self.manager.mappings['task_mappings']['T2']
        self.assertEqual(mapping['extra'], 'metadata')
    
    def test_reverse_lookup(self):
        """Test looking up task by issue number"""
        self.manager.add_mapping('T1', 123)
        self.manager.add_mapping('T2', 456)
        
        self.assertEqual(self.manager.get_task_for_issue(123), 'T1')
        self.assertEqual(self.manager.get_task_for_issue(456), 'T2')
        self.assertIsNone(self.manager.get_task_for_issue(789))
    
    def test_remove_mapping(self):
        """Test removing mappings"""
        self.manager.add_mapping('T1', 123)
        self.manager.add_mapping('T2', 456)
        
        self.manager.remove_mapping('T1')
        
        self.assertIsNone(self.manager.get_issue_for_task('T1'))
        self.assertEqual(self.manager.get_issue_for_task('T2'), 456)
    
    def test_conflict_tracking(self):
        """Test conflict recording and retrieval"""
        self.manager.add_conflict('T1', 'status_mismatch', 'Board says done, GitHub says open')
        self.manager.add_conflict('T2', 'missing_issue', 'Task exists in board but not GitHub')
        self.manager.add_conflict('T1', 'assignee_mismatch', 'Different assignees')
        
        # Get all conflicts
        all_conflicts = self.manager.get_conflicts()
        self.assertEqual(len(all_conflicts), 3)
        
        # Get conflicts for specific task
        t1_conflicts = self.manager.get_conflicts('T1')
        self.assertEqual(len(t1_conflicts), 2)
        
        # Clear conflicts for T1
        self.manager.clear_conflicts('T1')
        remaining = self.manager.get_conflicts()
        self.assertEqual(len(remaining), 1)
        self.assertEqual(remaining[0]['task_id'], 'T2')
    
    def test_validation(self):
        """Test mapping validation"""
        self.manager.add_mapping('T1', 123)
        self.manager.add_mapping('T2', 123)  # Duplicate issue
        self.manager.add_mapping('T3', 456)
        
        validation = self.manager.validate_mappings()
        
        self.assertFalse(validation['valid'])
        self.assertEqual(len(validation['errors']), 1)
        self.assertIn('multiple tasks', validation['errors'][0])
    
    def test_save_and_load(self):
        """Test saving and loading mappings"""
        self.manager.add_mapping('T1', 123)
        self.manager.add_mapping('T2', 456)
        self.manager.save_mappings()
        
        # Create new manager instance to test loading
        new_manager = TaskMappingManager(self.test_mapping.name)
        
        self.assertEqual(new_manager.get_issue_for_task('T1'), 123)
        self.assertEqual(new_manager.get_issue_for_task('T2'), 456)


class TestIntegration(unittest.TestCase):
    """Test integration between parser and mapping manager"""
    
    def setUp(self):
        """Set up test files"""
        self.test_board = tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False)
        self.test_board.write("""# Tasks
| ID | Task | Skills | Owner | Status | Dependencies | Priority | Hours |
|---|---|---|---|---|---|---|---|
| T1 | Task one | python | agent-1 | ✨ ready | - | P0 | 2 |
| T2 | Task two | javascript | agent-2 | ✅ assigned | T1 | P1 | 3 |
""")
        self.test_board.close()
        
        self.test_mapping = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
        self.test_mapping.close()
    
    def tearDown(self):
        """Clean up"""
        os.unlink(self.test_board.name)
        os.unlink(self.test_mapping.name)
    
    def test_parse_and_map(self):
        """Test parsing tasks and creating mappings"""
        # Parse board
        parser = BoardParser(self.test_board.name)
        tasks = parser.parse()
        
        # Create mappings
        manager = TaskMappingManager(self.test_mapping.name)
        for i, task in enumerate(tasks):
            manager.add_mapping(task.id, 100 + i)
        
        # Verify
        self.assertEqual(manager.get_issue_for_task('T1'), 100)
        self.assertEqual(manager.get_issue_for_task('T2'), 101)


if __name__ == '__main__':
    unittest.main()