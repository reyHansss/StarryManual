import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationNodeDatum,
} from 'd3-force';
import type { GraphRelation } from './graph';

type Point = { x: number; y: number };
export type MotionPoint = Point & { id: string };
type Particle = MotionPoint & SimulationNodeDatum & { homeX: number; homeY: number };

/** 拖动唤醒弹力与排斥，释放后有限衰减；位置只属于当前画布，不写入文章。 */
export function createGraphMotion(
  positions: MotionPoint[],
  relations: GraphRelation[],
  layout: 'connections' | 'modules',
) {
  const particles: Particle[] = positions.map((point) => ({
    ...point,
    homeX: point.x,
    homeY: point.y,
  }));
  const byId = new Map(particles.map((point) => [point.id, point]));
  const links = relations.map((relation) => ({
    source: relation.source,
    target: relation.target,
    distance: Math.max(
      190,
      Math.hypot(
        byId.get(relation.source)!.x - byId.get(relation.target)!.x,
        byId.get(relation.source)!.y - byId.get(relation.target)!.y,
      ),
    ),
  }));
  const anchorStrength = layout === 'modules' ? 0.09 : 0.025;
  const anchorX = forceX<Particle>((point) => point.homeX).strength(anchorStrength);
  const anchorY = forceY<Particle>((point) => point.homeY).strength(anchorStrength * 1.5);
  // 由画布的 RAF 驱动 tick，关闭 d3 自带计时器，避免重复循环或卸载后继续计算。
  const simulation = forceSimulation(particles)
    .stop()
    .alpha(0)
    .alphaDecay(0.075)
    .alphaMin(0.005)
    .velocityDecay(0.34)
    .force(
      'links',
      forceLink<Particle, (typeof links)[number]>(links)
        .id((point) => point.id)
        .distance((link) => link.distance)
        .strength(layout === 'modules' ? 0.12 : 0.3),
    )
    .force('charge', forceManyBody<Particle>().strength(-900).distanceMax(700))
    .force('spacing', forceCollide<Particle>(85).strength(0.65))
    .force('homeX', anchorX)
    .force('homeY', anchorY);
  let reducedMotion = false;

  function stop() {
    simulation.alpha(0).alphaTarget(0);
    for (const point of particles) {
      point.vx = point.vy = 0;
      point.fx = point.fy = null;
    }
  }

  return {
    update(id: string, position: Point | undefined, dragging: boolean) {
      const point = byId.get(id);
      if (!point) return;
      if (position) {
        point.x = position.x;
        point.y = position.y;
      }
      point.vx = point.vy = 0;
      point.fx = dragging ? point.x : null;
      point.fy = dragging ? point.y : null;
      if (!dragging) {
        // 松手位置成为新的弱锚点，保留读者的整理结果，不弹回拖动前的位置。
        point.homeX = point.x;
        point.homeY = point.y;
        anchorX.x((particle) => particle.homeX);
        anchorY.y((particle) => particle.homeY);
      }
      if (!reducedMotion) {
        simulation.alpha(Math.max(simulation.alpha(), 0.55)).alphaTarget(dragging ? 0.18 : 0);
      }
    },
    tick() {
      simulation.tick();
      return particles.map(({ id, x, y }) => ({ id, x, y }));
    },
    isActive() {
      return !reducedMotion && simulation.alpha() >= simulation.alphaMin();
    },
    setReducedMotion(value: boolean) {
      reducedMotion = value;
      if (value) stop();
    },
    stop,
  };
}
