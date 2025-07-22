'use client';

import { useQuery, useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Check, X, Mail, Calendar, Building, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

export function PendingInvitations() {
  const invitations = useQuery(api.functions.auth.invitations.getPendingInvitations);
  const acceptInvitation = useMutation(api.functions.auth.invitations.acceptInvitation);
  const declineInvitation = useMutation(api.functions.auth.invitations.declineInvitation);

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [action, setAction] = useState<'accept' | 'decline' | null>(null);

  const handleAccept = async (invitationId: string, orgName: string) => {
    setProcessingId(invitationId);
    setAction('accept');

    try {
      await acceptInvitation({ invitationId });
      toast.success(`Joined ${orgName} successfully!`);
    } catch (error) {
      toast.error('Failed to accept invitation');
      console.error(error);
    } finally {
      setProcessingId(null);
      setAction(null);
    }
  };

  const handleDecline = async (invitationId: string) => {
    setProcessingId(invitationId);
    setAction('decline');

    try {
      await declineInvitation({ invitationId });
      toast.success('Invitation declined');
    } catch (error) {
      toast.error('Failed to decline invitation');
      console.error(error);
    } finally {
      setProcessingId(null);
      setAction(null);
    }
  };

  const getOrgInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  if (!invitations || invitations.length === 0) {
    return null;
  }

  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardHeader>
        <CardTitle className="text-lg">Pending Invitations</CardTitle>
        <CardDescription>
          You have {invitations.length} pending invitation{invitations.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {invitations.map((invitation) => (
          <div
            key={invitation._id}
            className="flex items-center justify-between p-4 bg-white rounded-lg border"
          >
            <div className="flex items-center gap-4">
              <Avatar className="h-10 w-10">
                <AvatarFallback>{getOrgInitials(invitation.organizationName)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{invitation.organizationName}</h4>
                  <Badge variant="outline" className="text-xs">
                    {invitation.role}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    From {invitation.inviterName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(invitation.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {invitation.customMessage && (
                  <p className="text-sm text-muted-foreground mt-2 italic">
                    &ldquo;{invitation.customMessage}&rdquo;
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDecline(invitation._id)}
                disabled={processingId === invitation._id}
              >
                {processingId === invitation._id && action === 'decline' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <X className="h-4 w-4 mr-1" />
                    Decline
                  </>
                )}
              </Button>
              <Button
                size="sm"
                onClick={() => handleAccept(invitation._id, invitation.organizationName)}
                disabled={processingId === invitation._id}
              >
                {processingId === invitation._id && action === 'accept' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Accept
                  </>
                )}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
