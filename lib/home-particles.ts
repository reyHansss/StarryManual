/** 首页两层画布共用视口与指针输入；所有坐标和速度均以 CSS 像素计。 */
export type ParticlePointer = { x: number; y: number; active: boolean; speed: number };

export type ParticleScene = {
  resize: (width: number, height: number) => void;
  draw: (time: number, delta: number, pointer: ParticlePointer, animated: boolean) => void;
};

type PortraitPoint = {
  u: number;
  v: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
};

/** 从透明图片取样为彩色微粒。透明边缘不生成点，浅色略向中性深灰收敛以适合白底。 */
export async function createPortraitScene(
  context: CanvasRenderingContext2D,
  source: string,
): Promise<ParticleScene> {
  const image = new Image();
  image.src = source;
  await image.decode();
  const sample = document.createElement('canvas');
  const resolution = 176;
  sample.width = resolution;
  sample.height = resolution;
  const sampler = sample.getContext('2d', { willReadFrequently: true })!;
  sampler.drawImage(image, 0, 0, resolution, resolution);
  const { data } = sampler.getImageData(0, 0, resolution, resolution);
  const groups = new Map<string, PortraitPoint[]>();
  let count = 0;
  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      const offset = (y * resolution + x) * 4;
      if (data[offset + 3] < 128) continue;
      const luminance =
        data[offset] * 0.2126 + data[offset + 1] * 0.7152 + data[offset + 2] * 0.0722;
      const ink = 0.1 + (luminance / 255) * 0.23;
      const channels = [75, 68, 71].map(
        (channel, index) =>
          Math.round((data[offset + index] * (1 - ink) + channel * ink) / 12) * 12,
      );
      const color = `rgb(${channels.join(' ')})`;
      const group = groups.get(color) ?? [];
      group.push({
        u: (x + 0.5) / resolution,
        v: (y + 0.5) / resolution,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        phase: ((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1) * Math.PI * 2,
      });
      count++;
      groups.set(color, group);
    }
  }
  context.canvas.dataset.particles = String(count);
  let width = 0;
  let height = 0;
  let size = 0;
  let left = 0;
  let top = 0;

  return {
    resize(nextWidth, nextHeight) {
      width = nextWidth;
      height = nextHeight;
      size = Math.min(width - 32, height - 24, 540);
      left = (width - size) / 2;
      top = (height - size) / 2;
      for (const points of groups.values()) {
        for (const point of points) {
          point.x = left + point.u * size;
          point.y = top + point.v * size;
          point.vx = 0;
          point.vy = 0;
        }
      }
    },
    draw(time, delta, pointer, animated) {
      context.clearRect(0, 0, width, height);
      const radius = Math.min(115, size * 0.27);
      const damping = Math.exp(-10 * delta);
      const dot = Math.max(0.9, (size / resolution) * 0.74);
      // 入场偏移只持续约一秒，后续只保留轻微呼吸与局部排斥，不周期性打散整张图。
      const entrance = animated ? Math.exp(-time * 5.5) * size * 0.25 : 0;
      for (const [color, points] of groups) {
        context.fillStyle = color;
        context.beginPath();
        for (const point of points) {
          const anchorX = left + point.u * size;
          const anchorY = top + point.v * size;
          if (animated) {
            let forceX = 0;
            let forceY = 0;
            if (pointer.active) {
              const dx = point.x - pointer.x;
              const dy = point.y - pointer.y;
              const distance = Math.hypot(dx, dy);
              if (distance < radius) {
                const force = (1 - distance / radius) ** 2 * (3800 + pointer.speed * 3);
                forceX = (distance > 0.1 ? dx / distance : Math.cos(point.phase)) * force;
                forceY = (distance > 0.1 ? dy / distance : Math.sin(point.phase)) * force;
              }
            }
            // 有界时间步与阻尼弹簧保证切回页面后不会跳跃，鼠标停留时仍持续作用。
            point.vx = (point.vx + ((anchorX - point.x) * 82 + forceX) * delta) * damping;
            point.vy = (point.vy + ((anchorY - point.y) * 82 + forceY) * delta) * damping;
            point.x += point.vx * delta;
            point.y += point.vy * delta;
          } else {
            point.x = anchorX;
            point.y = anchorY;
          }
          const shimmer = animated ? Math.sin(time * 1.2 + point.phase) * 0.12 : 0;
          const x = point.x + Math.cos(point.phase) * entrance + shimmer;
          const y = point.y + Math.sin(point.phase) * entrance + shimmer;
          context.rect(x - dot / 2, y - dot / 2, dot, dot);
        }
        context.fill();
      }
    },
  };
}

/** 参考鼠标局部显现的符号点阵，保留浅色底；停留时显现，离开后平滑淡出。 */
export function createBackgroundScene(context: CanvasRenderingContext2D): ParticleScene {
  let width = 0;
  let height = 0;
  let reveal = 0;
  let focusX = 0;
  let focusY = 0;
  const palette = ['#c76e82', '#70a9c4', '#c79a68', '#77ae9b'];
  return {
    resize(nextWidth, nextHeight) {
      width = nextWidth;
      height = nextHeight;
    },
    draw(time, delta, pointer, animated) {
      context.clearRect(0, 0, width, height);
      const active = animated && pointer.active;
      reveal += ((active ? 1 : 0) - reveal) * Math.min(1, delta * 9);
      if (active) {
        focusX = pointer.x;
        focusY = pointer.y;
      }
      if (!animated) reveal = 0;
      const radius = width < 600 ? 150 : 230;
      if (reveal > 0.01) {
        const glow = context.createRadialGradient(focusX, focusY, 0, focusX, focusY, radius);
        glow.addColorStop(0, `rgba(244, 180, 193, ${0.12 * reveal})`);
        glow.addColorStop(0.6, `rgba(168, 210, 227, ${0.05 * reveal})`);
        glow.addColorStop(1, 'rgba(244, 180, 193, 0)');
        context.fillStyle = glow;
        context.fillRect(focusX - radius, focusY - radius, radius * 2, radius * 2);
      }
      const spacing = width < 600 ? 38 : 46;
      context.font = '11px ui-monospace, monospace';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      for (let row = 0, y = 20; y < height; row++, y += spacing) {
        for (let col = 0, x = 20; x < width; col++, x += spacing) {
          const seed = row * 19 + col * 7;
          const distance = Math.hypot(x - focusX, y - focusY);
          const influence = Math.max(0, 1 - distance / radius) ** 1.3 * reveal;
          const idle = seed % 7 === 0 ? 0.12 : 0.035;
          const alpha = idle + influence * 0.68;
          context.globalAlpha = alpha;
          context.fillStyle = palette[seed % palette.length];
          context.strokeStyle = context.fillStyle;
          if (influence < 0.045) {
            context.fillRect(x, y, 1.3, 1.3);
            continue;
          }
          const scale = 0.6 + influence * 0.8;
          const float = animated ? Math.sin(time * 1.3 + seed) * influence * 3 : 0;
          const dy = y + float;
          switch (seed % 5) {
            case 0:
            case 1:
              context.fillText(String(seed % 2), x, dy);
              break;
            case 2:
              context.beginPath();
              context.arc(x, dy, 3 * scale, 0, Math.PI * 2);
              context.fill();
              break;
            case 3:
              context.lineWidth = 1;
              context.strokeRect(x - 2.5 * scale, dy - 2.5 * scale, 5 * scale, 5 * scale);
              break;
            default:
              context.beginPath();
              context.moveTo(x, dy - 4 * scale);
              context.lineTo(x + 3 * scale, dy);
              context.lineTo(x, dy + 4 * scale);
              context.lineTo(x - 3 * scale, dy);
              context.closePath();
              context.fill();
          }
        }
      }
      context.globalAlpha = 1;
    },
  };
}
