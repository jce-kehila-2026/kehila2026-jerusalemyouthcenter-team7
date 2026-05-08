// src/context/EventsContext.js

import { createContext, useContext, useState } from "react";
import { events as initialEvents } from "../data/mockData";

const EventsContext = createContext();

export function EventsProvider({ children }) {
  const [events, setEvents] = useState(initialEvents);

  const addEvent = (newEvent) => {
    setEvents((prev) => [
      ...prev,
      { ...newEvent, event_id: Date.now(), group_id: null },
    ]);
  };

  const updateEvent = (updatedEvent) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.event_id === updatedEvent.event_id ? { ...e, ...updatedEvent } : e,
      ),
    );
  };

  const deleteEvent = (eventId) => {
    setEvents((prev) => prev.filter((e) => e.event_id !== eventId));
  };

  return (
    <EventsContext.Provider
      value={{ events, addEvent, updateEvent, deleteEvent }}
    >
      {children}
    </EventsContext.Provider>
  );
}

export function useEvents() {
  return useContext(EventsContext);
}
