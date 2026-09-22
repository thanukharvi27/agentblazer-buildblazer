import React from 'react';
import { CreateNewEventSection } from '../components/admin/AdminPanel';
import { AdminTab } from './AdminLayout';

interface AdminCreateEventProps {
  setTab: (tab: AdminTab) => void;
}

export function AdminCreateEvent({ setTab }: AdminCreateEventProps) {
  return (
    <CreateNewEventSection
      onSuccess={() => setTab('events')}
      setTab={setTab}
    />
  );
}

export default AdminCreateEvent;
