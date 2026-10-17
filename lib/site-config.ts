export const isStaticExport = process.env.NEXT_PUBLIC_STARRY_STATIC_EXPORT === 'true';

/** 为不经过 Next Link 的静态资源补上部署路径。 */
export function assetUrl(pathname: string) {
  return `${process.env.NEXT_PUBLIC_STARRY_BASE_PATH ?? ''}${pathname}`;
}
