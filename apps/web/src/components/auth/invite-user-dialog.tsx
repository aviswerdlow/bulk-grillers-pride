'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Shield, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Id } from '@/../../../convex/_generated/dataModel';

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: Id<'organizations'>;
}

type UserRole = 'admin' | 'editor' | 'viewer';

const roleDescriptions: Record<UserRole, string> = {
  admin: 'Can manage team members, settings, and all resources',
  editor: 'Can create and edit products, categories, and imports',
  viewer: 'Can view all resources but cannot make changes',
};

export function InviteUserDialog({ open, onOpenChange, organizationId }: InviteUserDialogProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('editor');
  const [message, setMessage] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState('');

  const inviteUser = useMutation((api as any).functions.auth.invitations.inviteToOrganization);

  const handleInvite = async () => {
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsInviting(true);
    setError('');

    try {
      await inviteUser({
        organizationId,
        email,
        role,
      });

      toast.success(`Invitation sent to ${email}`);

      // Reset form
      setEmail('');
      setRole('editor');
      setMessage('');
      onOpenChange(false);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('already a member')) {
          setError('This user is already a member of the organization');
        } else if (error.message.includes('already been invited')) {
          setError('An invitation has already been sent to this email');
        } else {
          setError('Failed to send invitation. Please try again.');
        }
      } else {
        setError('Failed to send invitation. Please try again.');
      }
      console.error(error);
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to join your organization. They&apos;ll receive an email with
            instructions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                id="email"
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
              <SelectTrigger id="role">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  <div className="space-y-1">
                    <p className="font-medium">Admin</p>
                    <p className="text-xs text-muted-foreground">{roleDescriptions.admin}</p>
                  </div>
                </SelectItem>
                <SelectItem value="editor">
                  <div className="space-y-1">
                    <p className="font-medium">Editor</p>
                    <p className="text-xs text-muted-foreground">{roleDescriptions.editor}</p>
                  </div>
                </SelectItem>
                <SelectItem value="viewer">
                  <div className="space-y-1">
                    <p className="font-medium">Viewer</p>
                    <p className="text-xs text-muted-foreground">{roleDescriptions.viewer}</p>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Custom Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a personal message to the invitation..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isInviting}>
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={!email || isInviting}>
            {isInviting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Invitation'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
