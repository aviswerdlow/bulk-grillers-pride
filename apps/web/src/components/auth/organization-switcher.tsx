'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Building, ChevronDown, Plus, Settings, Users, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface OrganizationSwitcherProps {
  className?: string;
  variant?: 'dropdown' | 'select';
}

export function OrganizationSwitcher({
  className,
  variant = 'dropdown',
}: OrganizationSwitcherProps) {
  const router = useRouter();
  const params = useParams();
  const currentOrgSlug = params.orgSlug as string;

  const [isSwitching, setIsSwitching] = useState(false);

  const userWithOrgs = useQuery(api.functions.auth.users.currentWithOrganizations);
  const switchOrganization = useMutation(api.functions.auth.sessions.switchOrganization);
  const currentOrg = useQuery(
    api.functions.organizations.organizations.getOrganizationBySlug,
    currentOrgSlug ? { slug: currentOrgSlug } : 'skip'
  );

  const organizations = userWithOrgs?.organizations || [];

  const handleSwitch = async (orgId: string, slug: string) => {
    if (slug === currentOrgSlug) return;

    setIsSwitching(true);
    try {
      await switchOrganization({ organizationId: orgId });
      router.push(`/${slug}/dashboard`);
      toast.success('Switched organization successfully');
    } catch (error) {
      toast.error('Failed to switch organization');
      console.error(error);
    } finally {
      setIsSwitching(false);
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

  if (!userWithOrgs || !currentOrg) {
    return (
      <div className={cn('flex items-center', className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (variant === 'select') {
    return (
      <Select
        value={currentOrg._id}
        onValueChange={(value) => {
          const org = organizations.find((o: any) => o._id === value);
          if (org) handleSwitch(org._id, org.slug);
        }}
        disabled={isSwitching}
      >
        <SelectTrigger className={cn('w-[250px]', className)}>
          <SelectValue>
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              <span className="truncate">{currentOrg.name}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {organizations.map((org: any) => (
            <SelectItem key={org._id} value={org._id}>
              <div className="flex items-center gap-2">
                <span className="truncate">{org.name}</span>
                {org.memberRole && (
                  <Badge variant="outline" className="text-xs">
                    {org.memberRole}
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn('justify-between', className)}
          disabled={isSwitching}
        >
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs bg-primary/10">
                {getOrgInitials(currentOrg.name)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate max-w-[150px] font-medium">{currentOrg.name}</span>
          </div>
          {isSwitching ? (
            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
          ) : (
            <ChevronDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[250px]">
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {organizations.map((org: any) => (
          <DropdownMenuItem
            key={org._id}
            onClick={() => handleSwitch(org._id, org.slug)}
            className="cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-xs">{getOrgInitials(org.name)}</AvatarFallback>
                </Avatar>
                <span className="truncate">{org.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {org.memberRole && (
                  <Badge variant="outline" className="text-xs">
                    {org.memberRole}
                  </Badge>
                )}
                {org._id === currentOrg._id && <Check className="h-3 w-3" />}
              </div>
            </div>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/onboarding" className="cursor-pointer">
            <Plus className="mr-2 h-4 w-4" />
            Create Organization
          </Link>
        </DropdownMenuItem>

        {currentOrg && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/${currentOrgSlug}/team`} className="cursor-pointer">
                <Users className="mr-2 h-4 w-4" />
                Team Members
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/${currentOrgSlug}/settings`} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Organization Settings
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
