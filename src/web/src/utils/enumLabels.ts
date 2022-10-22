import { UserLocation } from '@prisma/client';

export const locationEnumLabel: Record<typeof UserLocation[keyof typeof UserLocation], string> = {
  [UserLocation.InPerson]: 'In Person',
  [UserLocation.Online]: 'Online',
  [UserLocation.Proxy]: 'Proxy',
};
