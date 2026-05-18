import { createContext, useContext, useEffect, useState } from "react";
import { getEvents } from "../../backend/eventsService";

const EventsContext = createContext();

export function EventsProvider({ children }) {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const load = async () => {
      const data = await getEvents();
      setEvents(data);
    };
    load();
  }, []);

  const addEvent = (newEvent) => {
    setEvents((prev) => [...prev, { ...newEvent, id: Date.now().toString() }]);
  };

  const updateEvent = (updatedEvent) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === updatedEvent.id ? { ...e, ...updatedEvent } : e))
    );
  };

  const deleteEvent = (eventId) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  };

  return (
    <EventsContext.Provider value={{ events, addEvent, updateEvent, deleteEvent }}>
      {children}
    </EventsContext.Provider>
  );
}

export function useEvents() {
  return useContext(EventsContext);
}
