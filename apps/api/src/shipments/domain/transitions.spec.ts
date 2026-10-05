import { assertTransition } from './transitions.js';
describe('Shipment lifecycle', () => {
  it('allows transit, delivery and cancellation but prevents reopening terminal deliveries', () => {
    expect(() => assertTransition('PENDING', 'IN_TRANSIT')).not.toThrow();
    expect(() => assertTransition('IN_TRANSIT', 'DELIVERED')).not.toThrow();
    expect(() => assertTransition('PENDING', 'CANCELLED')).not.toThrow();
    expect(() => assertTransition('PENDING', 'DELIVERED')).toThrow();
    expect(() => assertTransition('DELIVERED', 'IN_TRANSIT')).toThrow();
    expect(() => assertTransition('CANCELLED', 'PENDING')).toThrow();
  });
});
