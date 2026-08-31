import CountUp from 'react-countup';

interface AnimatedMetricValueProps {
  value?: number;
  className?: string;
  duration?: number;
}

function AnimatedMetricValue({ value, className = '', duration = 0.9 }: AnimatedMetricValueProps) {
  if (typeof value !== 'number') {
    return <span className={className}>-</span>;
  }

  return (
    <span className={className}>
      <CountUp
        end={value}
        duration={duration}
        preserveValue
        useEasing
        formattingFn={(nextValue) => Math.round(nextValue).toLocaleString('ko-KR')}
      />
    </span>
  );
}

export default AnimatedMetricValue;
