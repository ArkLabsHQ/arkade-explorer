'use client';

import { type ReactNode } from 'react';
import { QueryProvider } from './query-provider';
import { ThemeProvider } from './theme-provider';
import { StructureProvider } from './structure-provider';
import { ServerInfoProvider } from './server-info-provider';
import { ActivityStreamProvider } from './activity-stream-provider';
import { MoneyDisplayProvider } from './money-display-provider';
import { AssetIconApprovalProvider } from './asset-icon-approval-provider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <ThemeProvider>
        <StructureProvider>
          <AssetIconApprovalProvider>
            <MoneyDisplayProvider>
              <ServerInfoProvider>
                <ActivityStreamProvider>
                  {children}
                </ActivityStreamProvider>
              </ServerInfoProvider>
            </MoneyDisplayProvider>
          </AssetIconApprovalProvider>
        </StructureProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}
