'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreVertical, Shield, UserX, Search, Loader2, UserPlus, Clock, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { InviteUserDialog } from './invite-user-dialog';
import { UserRole, roleConfig } from '@/types/models';
import { Id } from '@/../../../convex/_generated/dataModel';

interface TeamMembersListProps {
  organizationId: string;
  currentUserRole?: string;
}

export function TeamMembersList({ organizationId, currentUserRole }: TeamMembersListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [userToRemove, setUserToRemove] = useState<{ id: string; name: string } | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  const members = useQuery(api.functions.auth.users.getOrganizationUsers, { organizationId });

  const activeSessions = useQuery(
    api.functions.auth.sessions.getActiveSessions,
    currentUserRole === 'owner' || currentUserRole === 'admin' ? { organizationId } : 'skip'
  );

  const updateUserRole = useMutation(api.functions.auth.permissions.updateUserRole);
  const removeUser = useMutation(api.functions.auth.permissions.removeUserFromOrganization);

  const filteredMembers =
    members?.filter(
      (member: any) =>
        member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  const canManageUsers = currentUserRole === 'owner' || currentUserRole === 'admin';

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setUpdatingRole(userId);
    try {
      await updateUserRole({
        organizationId,
        userId,
        role: newRole,
      });
      toast.success('Role updated successfully');
    } catch (error) {
      toast.error('Failed to update role');
      console.error(error);
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleRemoveUser = async () => {
    if (!userToRemove) return;

    try {
      await removeUser({
        organizationId,
        userId: userToRemove.id,
      });
      toast.success(`${userToRemove.name} removed from organization`);
      setUserToRemove(null);
    } catch (error) {
      toast.error('Failed to remove user');
      console.error(error);
    }
  };

  const getInitials = (firstName?: string, lastName?: string, email?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    } else if (firstName) {
      return firstName.substring(0, 2).toUpperCase();
    }
    return email?.substring(0, 2).toUpperCase() || '??';
  };

  const isUserActive = (userId: string) => {
    return activeSessions?.some((session: any) => session.userId === userId);
  };

  if (!members) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Manage your team members and their permissions</CardDescription>
            </div>
            {canManageUsers && (
              <Button onClick={() => setShowInviteDialog(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Members Table */}
          {filteredMembers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ? 'No members found matching your search' : 'No team members yet'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  {canManageUsers && <TableHead className="w-[50px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member: any) => (
                  <TableRow key={member._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={member.avatar} alt={member.firstName || member.email} />
                          <AvatarFallback>
                            {getInitials(member.firstName, member.lastName, member.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {member.firstName || member.lastName
                              ? `${member.firstName || ''} ${member.lastName || ''}`.trim()
                              : 'Unnamed User'}
                          </p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {member.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {canManageUsers && member.role !== 'owner' ? (
                        <Select
                          value={member.role as UserRole}
                          onValueChange={(value) => handleRoleChange(member._id, value as UserRole)}
                          disabled={updatingRole === member._id}
                        >
                          <SelectTrigger className="w-[120px]">
                            {updatingRole === member._id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <SelectValue />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(roleConfig.labels).map(
                              ([role, label]) =>
                                role !== 'owner' && (
                                  <SelectItem key={role} value={role}>
                                    <div className="flex items-center gap-2">
                                      <Shield className="h-3 w-3" />
                                      {label}
                                    </div>
                                  </SelectItem>
                                )
                            )}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge
                          variant={
                            roleConfig.colors[member.role as UserRole] as
                              | 'default'
                              | 'secondary'
                              | 'outline'
                              | 'destructive'
                          }
                        >
                          <Shield className="h-3 w-3 mr-1" />
                          {roleConfig.labels[member.role as UserRole]}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {isUserActive(member._id) ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <div className="h-2 w-2 bg-green-600 rounded-full mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500">
                          <Clock className="h-3 w-3 mr-1" />
                          Offline
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </TableCell>
                    {canManageUsers && (
                      <TableCell>
                        {member.role !== 'owner' && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="More actions">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() =>
                                  setUserToRemove({
                                    id: member._id,
                                    name: member.firstName || member.email,
                                  })
                                }
                              >
                                <UserX className="h-4 w-4 mr-2" />
                                Remove from team
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      {showInviteDialog && (
        <InviteUserDialog
          open={showInviteDialog}
          onOpenChange={setShowInviteDialog}
          organizationId={organizationId as Id<'organizations'>}
        />
      )}

      {/* Remove User Confirmation */}
      <AlertDialog open={!!userToRemove} onOpenChange={() => setUserToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove team member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {userToRemove?.name} from this organization? They will
              lose access to all resources.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveUser}
              className="bg-destructive text-destructive-foreground"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
