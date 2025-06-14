import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const InfinityLoader = ({ size = 55, stroke = 4, color = 'black', speed = 1.3 }) => {
  // Shared value for animation
  const progress = useSharedValue(0);

  // Animate the progress value
  React.useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: speed * 1000 }),
      -1, // Repeat infinitely
      true // Reverse direction
    );
  }, [progress]);

  // Animated props for the SVG path
  const animatedProps = useAnimatedProps(() => {
    const offset = progress.value * 360; // Rotate the path
    return {
      strokeDashoffset: offset,
    };
  });

  // Infinity path definition
  const infinityPath = `
    M 27.5,5
    C 42.5,5 42.5,55 27.5,55
    S 12.5,5 27.5,5
    M 27.5,55
    C 42.5,55 42.5,5 27.5,5
    S 12.5,55 27.5,55
  `;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width="100%" height="100%" viewBox="0 0 55 55">
        {/* Static background */}
        <Path
          d={infinityPath}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          opacity={0.1}
        />
        {/* Animated foreground */}
        <AnimatedPath
          animatedProps={animatedProps}
          d={infinityPath}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray="360" // Total length of the path
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default InfinityLoader;