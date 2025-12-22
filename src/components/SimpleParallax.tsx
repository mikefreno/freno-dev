import {
  createSignal,
  createEffect,
  onMount,
  onCleanup,
  children as resolveChildren,
  type ParentComponent,
  createMemo,
  For
} from "solid-js";
import { animate } from "motion";
import { createWindowWidth } from "~/lib/resize-utils";

type ParallaxBackground = {
  imageSet: { [key: number]: string };
  size: { width: number; height: number };
  verticalOffset: number;
};

type ParallaxLayerProps = {
  layer: number;
  caveParallax: ParallaxBackground;
  dimensions: { width: number; height: number };
  scale: number;
  scaledWidth: number;
  scaledHeight: number;
  verticalOffsetPixels: number;
  imagesNeeded: number;
  direction: number;
};

function ParallaxLayer(props: ParallaxLayerProps) {
  let containerRef: HTMLDivElement | undefined;

  const layerDepthFactor = createMemo(
    () => props.layer / (Object.keys(props.caveParallax.imageSet).length - 1)
  );
  const layerVerticalOffset = createMemo(
    () => props.verticalOffsetPixels * layerDepthFactor()
  );
  const speed = createMemo(() => (120 - props.layer * 10) * 1000);
  const targetX = createMemo(
    () => props.direction * -props.caveParallax.size.width * props.imagesNeeded
  );

  const containerStyle = createMemo(() => ({
    width: `${props.caveParallax.size.width * props.imagesNeeded * 3}px`,
    height: `${props.caveParallax.size.height}px`,
    left: `${(props.dimensions.width - props.scaledWidth) / 2}px`,
    top: `${(props.dimensions.height - props.scaledHeight) / 2 + layerVerticalOffset()}px`,
    "transform-origin": "center center",
    "will-change": "transform"
  }));

  // Set up animation when component mounts or when direction/speed changes
  createEffect(() => {
    if (!containerRef) return;

    const target = targetX();
    const duration = speed() / 1000;

    const controls = animate(
      containerRef,
      {
        transform: [
          `translateX(0px) scale(${props.scale})`,
          `translateX(${target}px) scale(${props.scale})`
        ]
      },
      {
        duration,
        easing: "linear",
        repeat: Infinity
      }
    );

    onCleanup(() => controls.stop());
  });

  const imageGroups = createMemo(() => {
    return [-1, 0, 1].map((groupOffset) => (
      <div
        class="absolute"
        style={{
          left: `${groupOffset * props.caveParallax.size.width * props.imagesNeeded}px`,
          width: `${props.caveParallax.size.width * props.imagesNeeded}px`,
          height: `${props.caveParallax.size.height}px`
        }}
      >
        {Array.from({ length: props.imagesNeeded }).map((_, index) => (
          <div
            class="absolute"
            style={{
              width: `${props.caveParallax.size.width}px`,
              height: `${props.caveParallax.size.height}px`,
              left: `${index * props.caveParallax.size.width}px`
            }}
          >
            <img
              src={props.caveParallax.imageSet[props.layer]}
              alt={`Parallax layer ${props.layer}`}
              width={props.caveParallax.size.width}
              height={props.caveParallax.size.height}
              style={{ "object-fit": "cover" }}
              loading={
                props.layer >
                Object.keys(props.caveParallax.imageSet).length - 3
                  ? "eager"
                  : "lazy"
              }
            />
          </div>
        ))}
      </div>
    ));
  });

  return (
    <div ref={containerRef} class="absolute" style={containerStyle()}>
      {imageGroups()}
    </div>
  );
}

const SimpleParallax: ParentComponent = (props) => {
  let containerRef: HTMLDivElement | undefined;
  const windowWidth = createWindowWidth(100);
  const [windowHeight, setWindowHeight] = createSignal(
    typeof window !== "undefined" ? window.innerHeight : 800
  );
  const [direction, setDirection] = createSignal(1);

  const dimensions = createMemo(() => ({
    width: windowWidth(),
    height: windowHeight()
  }));

  const caveParallax = createMemo<ParallaxBackground>(() => ({
    imageSet: {
      0: "/Cave/0.png",
      1: "/Cave/1.png",
      2: "/Cave/2.png",
      3: "/Cave/3.png",
      4: "/Cave/4.png",
      5: "/Cave/5.png",
      6: "/Cave/6.png",
      7: "/Cave/7.png"
    },
    size: { width: 384, height: 216 },
    verticalOffset: 0.4
  }));

  const layerCount = createMemo(
    () => Object.keys(caveParallax().imageSet).length - 1
  );
  const imagesNeeded = 3;

  onMount(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setWindowHeight(window.innerHeight);
      }, 100);
    };

    window.addEventListener("resize", handleResize);

    const intervalId = setInterval(() => {
      setDirection((prev) => prev * -1);
    }, 30000);

    onCleanup(() => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
      window.removeEventListener("resize", handleResize);
    });
  });

  const calculations = createMemo(() => {
    const dims = dimensions();
    if (dims.width === 0) {
      return {
        scale: 0,
        scaledWidth: 0,
        scaledHeight: 0,
        verticalOffsetPixels: 0
      };
    }

    const cave = caveParallax();
    const scaleHeight = dims.height / cave.size.height;
    const scaleWidth = dims.width / cave.size.width;
    const scale = Math.max(scaleHeight, scaleWidth) * 1.21;

    return {
      scale,
      scaledWidth: cave.size.width * scale,
      scaledHeight: cave.size.height * scale,
      verticalOffsetPixels: cave.verticalOffset * dims.height
    };
  });

  const parallaxLayers = createMemo(() => {
    const dims = dimensions();
    if (dims.width === 0) return null;

    const calc = calculations();
    const cave = caveParallax();
    const dir = direction();

    return Array.from({ length: layerCount() }).map((_, i) => {
      const layerIndex = layerCount() - i;
      return (
        <ParallaxLayer
          layer={layerIndex}
          caveParallax={cave}
          dimensions={dims}
          scale={calc.scale}
          scaledWidth={calc.scaledWidth}
          scaledHeight={calc.scaledHeight}
          verticalOffsetPixels={calc.verticalOffsetPixels}
          imagesNeeded={imagesNeeded}
          direction={dir}
        />
      );
    });
  });

  const resolved = resolveChildren(() => props.children);

  return (
    <div
      ref={containerRef}
      class="fixed inset-0 h-screen w-screen overflow-hidden"
    >
      <div class="absolute inset-0 bg-black"></div>
      <div
        class="absolute inset-0"
        style={{
          "margin-top": `${calculations().verticalOffsetPixels}px`
        }}
      >
        {parallaxLayers()}
      </div>
      <div class="relative z-10 h-full w-full">{resolved()}</div>
      <style>{`
        html,
        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
          width: 100%;
          height: 100%;
        }
      `}</style>
    </div>
  );
};

export default SimpleParallax;
