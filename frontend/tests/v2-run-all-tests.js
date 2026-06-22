/**
 * V2.0 全系统验收测试 - 主测试运行器
 * 执行所有测试并生成最终报告
 */

const path = require('path');

console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║          V2.0 全系统验收与稳定性回归测试                          ║
║                                                                  ║
║   1. 全链路功能测试                                               ║
║   2. 压力测试 (100并发/1000请求)                                  ║
║   3. 安全测试                                                    ║
║   4. 性能优化验证                                                ║
║   5. 监控配置验证                                                ║
║   6. 生成最终验收报告                                            ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
`);

// 测试结果收集
const TEST_RESULTS = {};
let allPassed = true;

async function runAllTests() {
  const startTime = Date.now();

  try {
    // 1. 全链路功能测试
    console.log('\n[1/5] 执行全链路功能测试...');
    try {
      const fullChainTest = require('./v2-full-chain-test.js');
      TEST_RESULTS.fullChainTest = await fullChainTest.runFullChainTest();
      if (TEST_RESULTS.fullChainTest.failed > 0) {
        console.log('⚠️  全链路测试存在失败项');
        allPassed = false;
      }
    } catch (error) {
      console.error('❌ 全链路测试执行失败:', error.message);
      TEST_RESULTS.fullChainTest = { passed: 0, failed: 1, error: error.message };
      allPassed = false;
    }

    // 2. 压力测试
    console.log('\n[2/5] 执行压力测试...');
    console.log('⚠️  注意: 压力测试需要较长时间，请耐心等待...');
    try {
      const stressTest = require('./v2-stress-test.js');
      TEST_RESULTS.stressTest = await stressTest.runStressTest();
      if (parseFloat(TEST_RESULTS.stressTest.successRate) < 95) {
        console.log('⚠️  压力测试成功率未达标');
        allPassed = false;
      }
    } catch (error) {
      console.error('❌ 压力测试执行失败:', error.message);
      TEST_RESULTS.stressTest = { successRate: 0, error: error.message };
      allPassed = false;
    }

    // 3. 安全测试
    console.log('\n[3/5] 执行安全测试...');
    try {
      const securityTest = require('./v2-security-test.js');
      TEST_RESULTS.securityTest = await securityTest.runSecurityTests();
      if (TEST_RESULTS.securityTest.summary.passed < TEST_RESULTS.securityTest.summary.total) {
        console.log('⚠️  安全测试存在未通过项');
        allPassed = false;
      }
    } catch (error) {
      console.error('❌ 安全测试执行失败:', error.message);
      TEST_RESULTS.securityTest = { summary: { passed: 0, total: 1 }, error: error.message };
      allPassed = false;
    }

    // 4. 性能优化验证
    console.log('\n[4/5] 验证性能优化...');
    try {
      const optimizationVerify = require('./v2-optimization-verify.js');
      TEST_RESULTS.optimizationVerify = await optimizationVerify.runOptimizationVerification();
    } catch (error) {
      console.error('❌ 性能优化验证失败:', error.message);
      TEST_RESULTS.optimizationVerify = { summary: { passed: 0, total: 1 }, error: error.message };
    }

    // 5. 监控配置验证
    console.log('\n[5/5] 验证监控配置...');
    try {
      const monitoringVerify = require('./v2-monitoring-verify.js');
      TEST_RESULTS.monitoringVerify = await monitoringVerify.runMonitoringVerification();
    } catch (error) {
      console.error('❌ 监控配置验证失败:', error.message);
      TEST_RESULTS.monitoringVerify = { summary: { passed: 0, total: 1 }, error: error.message };
    }

    // 6. 生成最终报告
    console.log('\n[6/6] 生成最终验收报告...');
    const finalReport = require('./v2-final-report.js');
    const reportResult = await finalReport.generateFinalReport(TEST_RESULTS);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    // 最终汇总
    console.log('\n' + '='.repeat(80));
    console.log('                    测试执行完成');
    console.log('='.repeat(80));
    console.log(`  总耗时: ${totalTime}s`);
    console.log(`  健康评分: ${reportResult.score}/100`);
    console.log(`  上线决策: ${reportResult.decision}`);
    console.log(`  报告位置: ${reportResult.reportPath}`);
    console.log('='.repeat(80));

    // 返回测试结果
    return {
      success: allPassed,
      results: TEST_RESULTS,
      report: reportResult
    };

  } catch (error) {
    console.error('\n❌ 测试执行过程中发生错误:', error);
    return {
      success: false,
      error: error.message,
      results: TEST_RESULTS
    };
  }
}

// 运行所有测试
runAllTests()
  .then(result => {
    console.log('\n测试结果已保存至 ./tests/ 目录');
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('致命错误:', error);
    process.exit(1);
  });