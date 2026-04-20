declare module "react-simple-maps" {
  import type { ComponentProps, ReactNode, CSSProperties, MouseEvent } from "react";

  type GeographyStyle = {
    default?: CSSProperties;
    hover?: CSSProperties;
    pressed?: CSSProperties;
  };

  type GeoFeature = {
    id: string | number;
    rsmKey: string;
    properties: Record<string, unknown>;
    geometry: unknown;
  };

  type ComposableMapProps = {
    projection?: string;
    projectionConfig?: {
      scale?: number;
      center?: [number, number];
      rotate?: [number, number, number];
    };
    width?: number;
    height?: number;
    style?: CSSProperties;
    children?: ReactNode;
  };

  type GeographiesProps = {
    geography: string | object;
    children: (args: { geographies: GeoFeature[] }) => ReactNode;
  };

  type GeographyProps = {
    geography: GeoFeature;
    key?: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    style?: GeographyStyle;
    onMouseEnter?: (event: MouseEvent<SVGPathElement>) => void;
    onMouseLeave?: (event: MouseEvent<SVGPathElement>) => void;
    onClick?: (event: MouseEvent<SVGPathElement>) => void;
  };

  export function ComposableMap(props: ComposableMapProps): JSX.Element;
  export function Geographies(props: GeographiesProps): JSX.Element;
  export function Geography(props: GeographyProps): JSX.Element;
  export function ZoomableGroup(props: ComponentProps<"g"> & {
    center?: [number, number];
    zoom?: number;
    children?: ReactNode;
  }): JSX.Element;
  export function Marker(props: ComponentProps<"g"> & {
    coordinates: [number, number];
    children?: ReactNode;
  }): JSX.Element;
}
