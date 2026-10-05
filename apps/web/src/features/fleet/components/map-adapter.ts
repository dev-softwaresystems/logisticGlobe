import type { ComponentType } from 'react';
import type { Vehicle } from '@logistics-globe/shared';
export interface FleetMapProviderProps {
  className?: string;
  vehicles: Vehicle[];
}
export interface FleetMapAdapter {
  name: string;
  View: ComponentType<FleetMapProviderProps>;
}
