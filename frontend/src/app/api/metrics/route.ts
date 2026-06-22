import { NextResponse } from 'next/server';

// 简单的内存指标存储
const metrics = {
  requestsTotal: 0,
  successTotal: 0,
  errorTotal: 0,
  durationSum: 0,
  durationCount: 0,
  durationBuckets: {
    '0.1': 0,
    '0.5': 0,
    '1': 0,
    '2': 0,
    '5': 0,
    '10': 0,
  },
};

// 从全局获取指标（如果有）
declare global {
  var storyboardMetrics: typeof metrics;
}

if (!global.storyboardMetrics) {
  global.storyboardMetrics = metrics;
}

export async function GET() {
  const m = global.storyboardMetrics || metrics;
  
  const output = `# HELP storyboard_service_requests_total Total number of requests
# TYPE storyboard_service_requests_total counter
storyboard_service_requests_total ${m.requestsTotal}

# HELP storyboard_service_success_total Total number of successful requests
# TYPE storyboard_service_success_total counter
storyboard_service_success_total ${m.successTotal}

# HELP storyboard_service_errors_total Total number of failed requests
# TYPE storyboard_service_errors_total counter
storyboard_service_errors_total ${m.errorTotal}

# HELP storyboard_api_duration_seconds API request duration in seconds
# TYPE storyboard_api_duration_seconds histogram
storyboard_api_duration_seconds_bucket{le="0.1"} ${m.durationBuckets['0.1']}
storyboard_api_duration_seconds_bucket{le="0.5"} ${m.durationBuckets['0.5']}
storyboard_api_duration_seconds_bucket{le="1"} ${m.durationBuckets['1']}
storyboard_api_duration_seconds_bucket{le="2"} ${m.durationBuckets['2']}
storyboard_api_duration_seconds_bucket{le="5"} ${m.durationBuckets['5']}
storyboard_api_duration_seconds_bucket{le="10"} ${m.durationBuckets['10']}
storyboard_api_duration_seconds_bucket{le="+Inf"} ${m.durationCount}
storyboard_api_duration_seconds_sum ${m.durationSum}
storyboard_api_duration_seconds_count ${m.durationCount}

# HELP process_cpu_seconds_total Total CPU seconds
# TYPE process_cpu_seconds_total counter
process_cpu_seconds_total ${process.cpuUsage().user / 1000000}

# HELP process_resident_memory_bytes Resident memory size in bytes
# TYPE process_resident_memory_bytes gauge
process_resident_memory_bytes ${process.memoryUsage().rss}

# HELP process_heap_bytes Heap memory size in bytes
# TYPE process_heap_bytes gauge
process_heap_bytes ${process.memoryUsage().heapUsed}
`;

  return new NextResponse(output, {
    headers: {
      'Content-Type': 'text/plain; version=0.0.4',
    },
  });
}
