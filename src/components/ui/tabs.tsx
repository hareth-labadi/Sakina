'use client';

import { Tabs as TabsPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn('flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line [scrollbar-width:thin]', className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        '-mb-px inline-flex min-h-12.5 cursor-pointer items-center gap-2 border-b-3 border-transparent px-4.5 text-[1.0625rem] font-semibold whitespace-nowrap text-mute transition-colors',
        'hover:text-ink data-[state=active]:border-ink data-[state=active]:text-ink',
        className
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn('pt-6 focus-visible:outline-none', className)} {...props} />;
}
