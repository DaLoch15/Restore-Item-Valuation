// Room types from ARCHITECTURE.md Appendix A
export const ROOM_TYPES = [
  { value: 'kitchen', label: 'Kitchen', icon: 'utensils' },
  { value: 'living_room', label: 'Living Room', icon: 'sofa' },
  { value: 'dining_room', label: 'Dining Room', icon: 'utensils' },
  { value: 'bedroom', label: 'Bedroom', icon: 'bed' },
  { value: 'bathroom', label: 'Bathroom', icon: 'bath' },
  { value: 'garage', label: 'Garage', icon: 'car' },
  { value: 'basement', label: 'Basement', icon: 'stairs' },
  { value: 'attic', label: 'Attic', icon: 'home' },
  { value: 'office', label: 'Office', icon: 'briefcase' },
  { value: 'laundry', label: 'Laundry Room', icon: 'washing-machine' },
  { value: 'hallway', label: 'Hallway', icon: 'door' },
  { value: 'closet', label: 'Closet', icon: 'archive' },
  { value: 'patio', label: 'Patio/Deck', icon: 'sun' },
  { value: 'other', label: 'Other', icon: 'folder' },
] as const;

export type RoomType = (typeof ROOM_TYPES)[number]['value'];

// Get room type config by value
export function getRoomType(value: string | null | undefined) {
  return ROOM_TYPES.find((rt) => rt.value === value) || ROOM_TYPES[ROOM_TYPES.length - 1];
}
