import type { ComponentType } from 'react';
import type { Vehicle } from '@logistics-globe/shared';
export interface FleetMapProviderProps {
  vehicles: Vehicle[];
  selectedId: string;
  onSelect: (id: string) => void;
  fitRequest: number;
  centerRequest: number;
  now: number;
}
export interface FleetMapAdapter {
  name: string;
  View: ComponentType<FleetMapProviderProps>;
}
