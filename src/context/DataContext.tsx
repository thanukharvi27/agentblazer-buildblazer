import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '../config/api';

export interface EventItem {
  id: number | string;
  title: string;
  date: string;
  badge: string;
  badgeClass?: string;
  badge_class?: string;
  description: string;
  meta?: string | null;
  tracks?: string[] | null;
  leads?: string | null;
  platform?: string | null;
  cover_image?: string | null;
  gallery?: string[];
  hoverImages?: string[] | null;
  display_order?: number;
  active?: number;
  // Upcoming Event Properties
  isUpcoming?: boolean;
  venue?: string;
  time?: string;
  registrationUrl?: string;
}

export interface MemberItem {
  id: number | string;
  name: string;
  role: string;
  title?: string;
  titleClass?: string;
  title_class?: string;
  description?: string;
  category: 'faculty' | 'student' | 'cwc';
  initials?: string;
  initials_color?: string;
  image?: string | null;
  image_url?: string | null;
  highlighted?: boolean | number;
  display_order?: number;
  active?: number;
}

export interface GuestItem {
  id: number | string;
  initials: string;
  name: string;
  org: string;
  role: string;
  label: string;
  labelColor?: string;
  label_color?: string;
  borderColor?: string;
  border_color?: string;
  display_order?: number;
}

export interface DataContextType {
  events: EventItem[];
  members: {
    faculty: MemberItem[];
    student: MemberItem[];
    cwc: MemberItem[];
  };
  guests: GuestItem[];
  about: Record<string, string>;
  loading: boolean;
  refreshData: () => Promise<void>;
  setEvents: React.Dispatch<React.SetStateAction<EventItem[]>>;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [members, setMembers] = useState<{ faculty: MemberItem[]; student: MemberItem[]; cwc: MemberItem[] }>({
    faculty: [],
    student: [],
    cwc: [],
  });
  const [guests, setGuests] = useState<GuestItem[]>([]);
  const [about, setAbout] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(async () => {
    try {
      const res = await fetch(getApiUrl('/api/public/data'));
      if (res.ok) {
        const data = await res.json();
        if (data.events && Array.isArray(data.events)) {
          setEvents(data.events);
        }
        if (data.members) {
          setMembers(data.members);
        }
        if (data.guests && Array.isArray(data.guests)) {
          setGuests(data.guests);
        }
        if (data.about) {
          setAbout(data.about);
        }
      }
    } catch (err) {
      console.error('Failed to load public site data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return (
    <DataContext.Provider value={{ events, members, guests, about, loading, refreshData, setEvents }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextType {
  const context = useContext(DataContext);
  if (!context) {
    // Graceful fallback for standalone usage
    return {
      events: [],
      members: { faculty: [], student: [], cwc: [] },
      guests: [],
      about: {},
      loading: false,
      refreshData: async () => {},
      setEvents: () => {},
    };
  }
  return context;
}

export default DataContext;
