'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  Trash2,
  Edit,
  Plus,
  Download,
  Eye,
  Calendar,
  Clock,
  Filter,
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface ActivityEvent {
  id: string;
  timestamp: number;
  userId: string;
  userName: string;
  action: 'create' | 'update' | 'delete' | 'restore' | 'view' | 'export';
  resource: 'product' | 'category' | 'user' | 'import';
  resourceId: string;
  resourceName: string;
  metadata?: Record<string, any>;
}

interface ActivityLogVisualizationProps {
  organizationId?: string;
  projectId?: string;
  timeRange?: number; // days
}

export function ActivityLogVisualization({
  organizationId,
  projectId,
  timeRange = 7,
}: ActivityLogVisualizationProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange.toString());
  const [selectedResource, setSelectedResource] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');

  // Generate mock data - replace with actual data from API
  const generateMockData = () => {
    const events: ActivityEvent[] = [];
    const users = ['john@example.com', 'jane@example.com', 'admin@example.com'];
    const actions: ActivityEvent['action'][] = ['create', 'update', 'delete', 'view', 'export'];
    const resources: ActivityEvent['resource'][] = ['product', 'category', 'import'];

    const now = Date.now();
    const daysToGenerate = parseInt(selectedTimeRange);

    for (let i = 0; i < daysToGenerate * 20; i++) {
      const daysAgo = Math.floor(Math.random() * daysToGenerate);
      const hoursAgo = Math.floor(Math.random() * 24);
      const minutesAgo = Math.floor(Math.random() * 60);
      
      events.push({
        id: `event-${i}`,
        timestamp: now - (daysAgo * 24 * 60 * 60 * 1000) - (hoursAgo * 60 * 60 * 1000) - (minutesAgo * 60 * 1000),
        userId: `user-${Math.floor(Math.random() * 3)}`,
        userName: users[Math.floor(Math.random() * users.length)]!,
        action: actions[Math.floor(Math.random() * actions.length)]!,
        resource: resources[Math.floor(Math.random() * resources.length)]!,
        resourceId: `res-${Math.floor(Math.random() * 100)}`,
        resourceName: `${resources[Math.floor(Math.random() * resources.length)]!} ${Math.floor(Math.random() * 100)}`,
      });
    }

    return events.sort((a, b) => b.timestamp - a.timestamp);
  };

  const events = generateMockData();

  // Filter events based on selections
  const filteredEvents = events.filter(event => {
    if (selectedResource !== 'all' && event.resource !== selectedResource) return false;
    if (selectedAction !== 'all' && event.action !== selectedAction) return false;
    return true;
  });

  // Prepare data for charts
  const prepareTimelineData = () => {
    const days = parseInt(selectedTimeRange);
    const data = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date).getTime();
      const dayEnd = endOfDay(date).getTime();

      const dayEvents = filteredEvents.filter(
        event => event.timestamp >= dayStart && event.timestamp <= dayEnd
      );

      data.push({
        date: format(date, 'MMM dd'),
        total: dayEvents.length,
        create: dayEvents.filter(e => e.action === 'create').length,
        update: dayEvents.filter(e => e.action === 'update').length,
        delete: dayEvents.filter(e => e.action === 'delete').length,
      });
    }

    return data;
  };

  const prepareActionData = () => {
    const actionCounts = filteredEvents.reduce((acc, event) => {
      acc[event.action] = (acc[event.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(actionCounts).map(([action, count]) => ({
      name: action.charAt(0).toUpperCase() + action.slice(1),
      value: count,
    }));
  };

  const prepareResourceData = () => {
    const resourceCounts = filteredEvents.reduce((acc, event) => {
      acc[event.resource] = (acc[event.resource] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(resourceCounts).map(([resource, count]) => ({
      name: resource.charAt(0).toUpperCase() + resource.slice(1),
      value: count,
    }));
  };

  const prepareUserActivityData = () => {
    const userActivity = filteredEvents.reduce((acc, event) => {
      if (!acc[event.userName]) {
        acc[event.userName] = { name: event.userName, actions: 0 };
      }
      acc[event.userName]!.actions++;
      return acc;
    }, {} as Record<string, { name: string; actions: number }>);

    return Object.values(userActivity)
      .sort((a, b) => b.actions - a.actions)
      .slice(0, 5);
  };

  const timelineData = prepareTimelineData();
  const actionData = prepareActionData();
  const resourceData = prepareResourceData();
  const userActivityData = prepareUserActivityData();

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <Plus className="h-4 w-4" />;
      case 'update':
        return <Edit className="h-4 w-4" />;
      case 'delete':
        return <Trash2 className="h-4 w-4" />;
      case 'view':
        return <Eye className="h-4 w-4" />;
      case 'export':
        return <Download className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-500';
      case 'update':
        return 'bg-blue-500';
      case 'delete':
        return 'bg-red-500';
      case 'view':
        return 'bg-gray-500';
      case 'export':
        return 'bg-purple-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Activity Analytics</h2>
          <p className="text-muted-foreground">Monitor and analyze user activity patterns</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24 hours</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedResource} onValueChange={setSelectedResource}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Resource" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Resources</SelectItem>
              <SelectItem value="product">Products</SelectItem>
              <SelectItem value="category">Categories</SelectItem>
              <SelectItem value="import">Imports</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedAction} onValueChange={setSelectedAction}>
            <SelectTrigger className="w-[140px]">
              <Activity className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="create">Create</SelectItem>
              <SelectItem value="update">Update</SelectItem>
              <SelectItem value="delete">Delete</SelectItem>
              <SelectItem value="view">View</SelectItem>
              <SelectItem value="export">Export</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredEvents.length}</div>
            <p className="text-xs text-muted-foreground">
              {filteredEvents.filter(e => e.timestamp > Date.now() - 24 * 60 * 60 * 1000).length} in last 24h
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(filteredEvents.map(e => e.userId)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Unique users in period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Active</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userActivityData[0]?.name.split('@')[0] || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {userActivityData[0]?.actions || 0} actions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Hour</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2-3 PM</div>
            <p className="text-xs text-muted-foreground">
              Most active time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="recent">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
              <CardDescription>
                Daily activity breakdown over the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="create"
                    stackId="1"
                    stroke="#10b981"
                    fill="#10b981"
                    name="Create"
                  />
                  <Area
                    type="monotone"
                    dataKey="update"
                    stackId="1"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    name="Update"
                  />
                  <Area
                    type="monotone"
                    dataKey="delete"
                    stackId="1"
                    stroke="#ef4444"
                    fill="#ef4444"
                    name="Delete"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Actions Distribution</CardTitle>
                <CardDescription>
                  Breakdown of activity types
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={actionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {actionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resources Distribution</CardTitle>
                <CardDescription>
                  Activity by resource type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={resourceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Active Users</CardTitle>
              <CardDescription>
                Users with the most activity in the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={userActivityData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip />
                  <Bar dataKey="actions" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity Feed</CardTitle>
              <CardDescription>
                Real-time activity stream
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {filteredEvents.slice(0, 20).map((event) => (
                  <div key={event.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                    <div className={`p-2 rounded-full ${getActionColor(event.action)} bg-opacity-10`}>
                      <div className={getActionColor(event.action).replace('bg-', 'text-')}>
                        {getActionIcon(event.action)}
                      </div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm">
                        <span className="font-medium">{event.userName}</span>
                        {' '}
                        <span className="text-muted-foreground">
                          {event.action === 'create' && 'created'}
                          {event.action === 'update' && 'updated'}
                          {event.action === 'delete' && 'deleted'}
                          {event.action === 'view' && 'viewed'}
                          {event.action === 'export' && 'exported'}
                        </span>
                        {' '}
                        <span className="font-medium">{event.resourceName}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(event.timestamp, 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {event.resource}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}