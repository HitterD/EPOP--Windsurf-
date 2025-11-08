"use client"

import * as React from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, ChevronLeft, ChevronRight, Plus, Clock, MapPin } from "lucide-react"
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, addMonths, subMonths } from "date-fns"
import type { DateRange } from "react-day-picker"
import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core'
import { DraggableEvent } from '@/features/calendar/components/draggable-event'
import { DroppableSlot } from '@/features/calendar/components/droppable-slot'
import { EventCreationDialog, NewEvent } from '@/features/calendar/components/event-creation-dialog'
import { toast } from 'sonner'

interface CalendarEvent {
  id: string
  title: string
  startDate: Date
  endDate?: Date
  type: 'task' | 'milestone' | 'mail' | 'reminder'
  color: string
  description?: string
  location?: string
}

// Mock events - replace with actual API
const mockEvents: CalendarEvent[] = [
  {
    id: '1',
    title: 'Project Alpha Kickoff',
    startDate: new Date(),
    type: 'milestone',
    color: 'bg-blue-500',
    description: 'Initial project meeting',
    location: 'Conference Room A'
  },
  {
    id: '2',
    title: 'Task: Review PR #123',
    startDate: addDays(new Date(), 1),
    endDate: addDays(new Date(), 1),
    type: 'task',
    color: 'bg-green-500',
  },
  {
    id: '3',
    title: 'Send Q4 Report',
    startDate: addDays(new Date(), 2),
    type: 'mail',
    color: 'bg-purple-500',
  },
]

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = React.useState<Date>(new Date())
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date())
  const [view, setView] = React.useState<'month' | 'week' | 'day' | 'agenda'>('month')
  const [events, setEvents] = React.useState<CalendarEvent[]>(mockEvents)
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = React.useState(false)
  const [newEventSlot, setNewEventSlot] = React.useState<{ date: Date; hour?: number } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Navigation handlers
  const handlePrevious = () => {
    if (view === 'month') setCurrentDate(subMonths(currentDate, 1))
    else if (view === 'week') setCurrentDate(subWeeks(currentDate, 1))
    else setCurrentDate(addDays(currentDate, -1))
  }

  const handleNext = () => {
    if (view === 'month') setCurrentDate(addMonths(currentDate, 1))
    else if (view === 'week') setCurrentDate(addWeeks(currentDate, 1))
    else setCurrentDate(addDays(currentDate, 1))
  }

  const handleToday = () => setCurrentDate(new Date())

  // Get events for a specific day
  const getEventsForDay = (date: Date) => {
    return events.filter(event => isSameDay(event.startDate, date))
  }

  // Handle drag end - reschedule event
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const draggedEventId = active.id as string
    const dropData = over.data.current as { date: Date; hour?: number }

    // Update event date/time
    setEvents((prevEvents) =>
      prevEvents.map((ev) => {
        if (ev.id === draggedEventId) {
          const newStartDate = new Date(dropData.date)
          if (dropData.hour !== undefined) {
            newStartDate.setHours(dropData.hour, 0, 0, 0)
          }
          
          toast.success(`Moved "${ev.title}" to ${format(newStartDate, 'MMM d, h:mm a')}`)
          
          return {
            ...ev,
            startDate: newStartDate,
          }
        }
        return ev
      })
    )
  }

  // Handle click on empty slot - create new event
  const handleSlotClick = (date: Date, hour?: number) => {
    setNewEventSlot({ date, ...(hour !== undefined ? { hour } : {}) })
    setShowCreateDialog(true)
  }

  // Handle create event
  const handleCreateEvent = (newEvent: NewEvent) => {
    const event: CalendarEvent = {
      id: `event-${Date.now()}`,
      title: newEvent.title,
      startDate: newEvent.startDate,
      type: newEvent.type,
      color: {
        task: 'bg-green-500',
        milestone: 'bg-blue-500',
        mail: 'bg-purple-500',
        reminder: 'bg-orange-500',
      }[newEvent.type],
      ...(newEvent.endDate ? { endDate: newEvent.endDate } : {}),
      ...(newEvent.description ? { description: newEvent.description } : {}),
      ...(newEvent.location ? { location: newEvent.location } : {}),
    }

    setEvents([...events, event])
    toast.success(`Created event: ${event.title}`)
  }

  // Week view days
  const weekDays = React.useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 })
    const end = endOfWeek(currentDate, { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [currentDate])

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd} onDragStart={(event) => setActiveId(event.active.id as string)}>
    <div className="flex h-full flex-col p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendar & Planner</h1>
          <p className="text-muted-foreground">
            {view === 'month' && format(currentDate, 'MMMM yyyy')}
            {view === 'week' && weekDays.length >= 7 && `Week of ${format(weekDays[0]!, 'MMM d')} - ${format(weekDays[6]!, 'MMM d, yyyy')}`}
            {view === 'day' && format(currentDate, 'EEEE, MMMM d, yyyy')}
            {view === 'agenda' && 'Upcoming Events'}
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Event
        </Button>
      </div>

      {/* Navigation & View Switcher */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Tabs value={view} onValueChange={(v) => setView(v as 'month' | 'week' | 'day' | 'agenda')} className="w-auto">
          <TabsList>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Calendar Views */}
      <div className="flex-1 overflow-y-auto">
        {view === 'month' && (
          <Card>
            <CardContent className="p-6">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                month={currentDate}
                onMonthChange={setCurrentDate}
                className="w-full"
              />
              
              {/* Selected Day Events */}
              {selectedDate && getEventsForDay(selectedDate).length > 0 && (
                <div className="mt-6 border-t pt-4">
                  <h3 className="mb-3 font-semibold">
                    Events on {format(selectedDate, 'MMMM d, yyyy')}
                  </h3>
                  <div className="space-y-2">
                    {getEventsForDay(selectedDate).map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center gap-3 rounded-lg border p-3"
                      >
                        <div className={`h-2 w-2 rounded-full ${event.color}`} />
                        <div className="flex-1">
                          <p className="font-medium">{event.title}</p>
                          {event.description && (
                            <p className="text-sm text-muted-foreground">{event.description}</p>
                          )}
                        </div>
                        <Badge variant="outline">{event.type}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {view === 'week' && (
          <Card>
            <CardContent className="p-0">
              <div className="grid grid-cols-7">
                {/* Day Headers */}
                {weekDays.map((day) => (
                  <div
                    key={day.toISOString()}
                    className={`border-b border-r p-3 text-center ${
                      isSameDay(day, new Date()) ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="text-sm font-semibold">{format(day, 'EEE')}</div>
                    <div className="text-2xl font-bold">{format(day, 'd')}</div>
                  </div>
                ))}
              </div>
              
              {/* Time Slots */}
              <div className="grid grid-cols-7">
                {weekDays.map((day) => (
                  <DroppableSlot
                    key={day.toISOString()}
                    id={`week-${day.toISOString()}`}
                    date={day}
                    className="min-h-[400px] border-r p-2 transition-colors"
                    onClick={() => handleSlotClick(day)}
                  >
                    <div className="space-y-1">
                      {getEventsForDay(day).map((event) => (
                        <DraggableEvent
                          key={event.id}
                          id={event.id}
                          title={event.title}
                          color={event.color}
                          type={event.type}
                        />
                      ))}
                    </div>
                  </DroppableSlot>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {view === 'day' && (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Hourly Grid */}
                {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                  <div key={hour} className="flex gap-4 border-b pb-4">
                    <div className="w-20 text-sm font-medium text-muted-foreground">
                      {format(new Date().setHours(hour, 0), 'ha')}
                    </div>
                    <DroppableSlot
                      id={`day-${currentDate.toISOString()}-${hour}`}
                      date={currentDate}
                      hour={hour}
                      className="flex-1 cursor-pointer rounded transition-colors hover:bg-muted/30"
                      onClick={() => handleSlotClick(currentDate, hour)}
                    >
                      <div className="space-y-2">
                        {getEventsForDay(currentDate)
                          .filter((event) => event.startDate.getHours() === hour)
                          .map((event) => (
                            <DraggableEvent
                              key={event.id}
                              id={event.id}
                              title={event.title}
                              color={event.color}
                              type={event.type}
                              startTime={format(event.startDate, 'h:mm a')}
                            />
                          ))}
                      </div>
                    </DroppableSlot>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {view === 'agenda' && (
          <div className="space-y-4">
            {events.map((event) => (
              <Card key={event.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`mt-1 h-3 w-3 rounded-full ${event.color}`} />
                    <div className="flex-1">
                      <div className="mb-2 flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{event.title}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {format(event.startDate, 'MMM d, yyyy ⋅ h:mm a')}
                          </div>
                        </div>
                        <Badge variant="outline">{event.type}</Badge>
                      </div>
                      {event.description && (
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                      )}
                      {event.location && (
                        <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <Card className="mt-4">
        <CardContent className="p-4">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-500" />
              <span>Milestones</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span>Tasks</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-purple-500" />
              <span>Scheduled Mail</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-orange-500" />
              <span>Reminders</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Event Creation Dialog */}
      {showCreateDialog && newEventSlot?.date && (
        <EventCreationDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          date={newEventSlot.date}
          {...(newEventSlot.hour !== undefined ? { hour: newEventSlot.hour } : {})}
          onSave={handleCreateEvent}
        />
      )}
    </div>
    </DndContext>
  )
}
