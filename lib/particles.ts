/** 全站背景与首页肖像复用指针输入；所有坐标和速度均以 CSS 像素计。 */
export type ParticlePointer = { x: number; y: number; active: boolean; speed: number };

/** 外扩画布保留透明余量，基础图片尺寸不变，展开后的粒子也不会在原边界被截断。 */
export const PORTRAIT_PADDING = 40;

export type ParticleScene = {
  resize: (width: number, height: number) => void;
  /** 返回是否还需要后续帧；静止的装饰背景不持续刷新。 */
  draw: (time: number, delta: number, pointer: ParticlePointer, animated: boolean) => boolean;
};

type PortraitPoint = {
  u: number;
  v: number;
  x: number;
  y: number;
  scale: number;
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
        scale: 1,
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
      size = Math.min(width - 32 - PORTRAIT_PADDING * 2, height - 24 - PORTRAIT_PADDING * 2, 540);
      left = (width - size) / 2;
      top = (height - size) / 2;
      for (const points of groups.values()) {
        for (const point of points) {
          point.x = left + point.u * size;
          point.y = top + point.v * size;
          point.scale = 1;
        }
      }
    },
    draw(_time, delta, pointer, animated) {
      context.clearRect(0, 0, width, height);
      const speed = animated && pointer.active ? pointer.speed : 0;
      const radius = Math.min(size * 0.78, size * 0.16 + speed * 0.15);
      const strength = speed > 25 ? Math.min(speed / 1600, 0.48) : 0;
      const response = 1 - Math.exp(-delta * 14);
      const dot = Math.max(0.9, (size / resolution) * 0.74);
      let unsettled = false;
      for (const [color, points] of groups) {
        context.fillStyle = color;
        context.beginPath();
        for (const point of points) {
          const anchorX = left + point.u * size;
          const anchorY = top + point.v * size;
          if (animated) {
            const dx = anchorX - pointer.x;
            const dy = anchorY - pointer.y;
            const normalized = (dx * dx + dy * dy) / (radius * radius);
            // 位移正比于原始间距，中心不被清空；三次衰减让外圈平滑接回原图。
            // 强度上限保证径向映射保持单调，不在外圈折叠、堆积成环。
            const dilation = normalized < 1 ? strength * (1 - normalized) ** 3 : 0;
            const targetX = anchorX + dx * dilation;
            const targetY = anchorY + dy * dilation;
            const targetScale = 1 + dilation * 0.75;
            point.x += (targetX - point.x) * response;
            point.y += (targetY - point.y) * response;
            // 点尺寸随局部展开稍增大，保持点阵连续；位置和点尺寸使用相同的阻尼。
            point.scale += (targetScale - point.scale) * response;
            unsettled ||=
              Math.abs(targetX - point.x) > 0.02 ||
              Math.abs(targetY - point.y) > 0.02 ||
              Math.abs(targetScale - point.scale) > 0.002;
          } else {
            point.x = anchorX;
            point.y = anchorY;
            point.scale = 1;
          }
          const diameter = dot * point.scale;
          context.rect(point.x - diameter / 2, point.y - diameter / 2, diameter, diameter);
        }
        context.fill();
      }
      return animated && (strength > 0 || unsettled);
    },
  };
}

/** 鼠标附近的符号各自随机变换；保留粗体轮廓，以接近底色的浅色融入页面。 */
export function createBackgroundScene(context: CanvasRenderingContext2D): ParticleScene {
  let width = 0;
  let height = 0;
  let reveal = 0;
  let focusX = 0;
  let focusY = 0;
  let points: { x: number; y: number; seed: number; influence: number }[] = [];
  const palette = ['#d8b3bd', '#b5cbd5', '#d8c5b2', '#b6d0c5'];
  const random = (seed: number) => {
    const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return value - Math.floor(value);
  };

  function symbol(kind: number, x: number, y: number, scale: number, alpha: number) {
    context.globalAlpha = alpha;
    const radius = 4.5 * scale;
    context.lineWidth = 1.8;
    context.lineJoin = 'round';
    switch (kind) {
      case 0:
      case 1:
        context.fillText(String(kind), x, y);
        break;
      case 2:
        context.beginPath();
        context.moveTo(x, y - radius);
        context.lineTo(x + radius, y + radius * 0.8);
        context.lineTo(x - radius, y + radius * 0.8);
        context.closePath();
        context.stroke();
        break;
      case 3:
        context.strokeRect(x - radius * 0.7, y - radius * 0.7, radius * 1.4, radius * 1.4);
        break;
      case 4:
        context.beginPath();
        context.moveTo(x, y - radius);
        context.lineTo(x + radius * 0.75, y);
        context.lineTo(x, y + radius);
        context.lineTo(x - radius * 0.75, y);
        context.closePath();
        context.fill();
        break;
      default:
        context.beginPath();
        context.arc(x, y, radius * 0.7, 0, Math.PI * 2);
        context.fill();
    }
  }
  return {
    resize(nextWidth, nextHeight) {
      width = nextWidth;
      height = nextHeight;
      const spacing = width < 600 ? 38 : 46;
      points = [];
      for (let row = 0, y = 20; y < height; row++, y += spacing) {
        for (let col = 0, x = 20; x < width; col++, x += spacing) {
          points.push({ x, y, seed: row * 19 + col * 7, influence: 0 });
        }
      }
    },
    draw(time, delta, pointer, animated) {
      context.clearRect(0, 0, width, height);
      const active = animated && pointer.active;
      const rise = 1 - Math.exp(-delta / 0.09);
      const fade = 1 - Math.exp(-delta / 0.32);
      reveal += ((active ? 1 : 0) - reveal) * (active ? rise : fade);
      if (active) {
        // 光晕平滑跟随，格点各自保留渐隐状态，鼠标经过的区域不会突然消失。
        focusX += (pointer.x - focusX) * rise;
        focusY += (pointer.y - focusY) * rise;
      }
      if (!animated) reveal = 0;
      const radius = width < 600 ? 150 : 230;
      if (reveal > 0.01) {
        const glow = context.createRadialGradient(focusX, focusY, 0, focusX, focusY, radius);
        glow.addColorStop(0, `rgba(244, 180, 193, ${0.045 * reveal})`);
        glow.addColorStop(0.6, `rgba(168, 210, 227, ${0.025 * reveal})`);
        glow.addColorStop(1, 'rgba(244, 180, 193, 0)');
        context.fillStyle = glow;
        context.fillRect(focusX - radius, focusY - radius, radius * 2, radius * 2);
      }
      context.font = '800 16px "Cascadia Code", Consolas, ui-monospace, monospace';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      let unsettled = false;
      for (const point of points) {
        const { x, y, seed } = point;
        const distance = Math.hypot(x - pointer.x, y - pointer.y);
        const target = active ? Math.max(0, 1 - distance / radius) ** 1.3 : 0;
        point.influence = animated
          ? point.influence + (target - point.influence) * (target > point.influence ? rise : fade)
          : 0;
        const influence = point.influence;
        unsettled ||= influence > 0.003;
        const idle = seed % 7 === 0 ? 0.07 : 0.025;
        const appearance = Math.min(1, influence / 0.18);
        const blendIn = appearance * appearance * (3 - 2 * appearance);
        const alpha = (idle + influence * 0.36) * blendIn;
        context.fillStyle = palette[seed % palette.length];
        context.strokeStyle = context.fillStyle;
        // 底层微点和显现符号交叉淡化，低强度时也没有切换阈值造成的跳变。
        if (blendIn < 1) {
          context.globalAlpha = idle * (1 - blendIn);
          context.fillRect(x, y, 1.3, 1.3);
        }
        if (influence < 0.003) continue;
        const scale = 0.7 + influence * 0.7;
        const float = animated ? Math.sin(time * 1.3 + seed) * influence * 3 : 0;
        const dy = y + float;
        // 每个格点采用不同周期与相位，停留时也会变换；交叉淡化避免整片闪烁。
        const cycle = time / (1.5 + random(seed) * 1.8) + random(seed + 31) * 10;
        const step = Math.floor(cycle);
        const progress = Math.min(1, (cycle - step) / 0.16);
        const blend = progress * progress * (3 - 2 * progress);
        const previous = Math.floor(random(seed + (step - 1) * 97) * 6);
        const next = Math.floor(random(seed + step * 97) * 6);
        if (blend < 1) symbol(previous, x, dy, scale, alpha * (1 - blend));
        symbol(next, x, dy, scale, alpha * blend);
      }
      context.globalAlpha = 1;
      return animated && (active || unsettled || reveal > 0.003);
    },
  };
}
