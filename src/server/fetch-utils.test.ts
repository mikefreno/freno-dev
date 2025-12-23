// Manual test file for fetch-utils error handling

import {
  fetchWithTimeout,
  checkResponse,
  NetworkError,
  TimeoutError,
  APIError,
  fetchWithRetry
} from "./fetch-utils";

async function testTimeoutError() {
  console.log("\n=== Testing Timeout Error ===");
  try {
    // This should timeout after 1ms
    await fetchWithTimeout("https://httpbin.org/delay/10", { timeout: 1 });
    console.log("❌ Should have thrown TimeoutError");
  } catch (error) {
    if (error instanceof TimeoutError) {
      console.log("✅ TimeoutError caught correctly");
      console.log(`   Message: ${error.message}`);
      console.log(`   Timeout: ${error.timeoutMs}ms`);
    } else {
      console.log("❌ Wrong error type:", error);
    }
  }
}

async function testNetworkError() {
  console.log("\n=== Testing Network Error ===");
  try {
    // This should fail to connect
    await fetchWithTimeout(
      "https://invalid-domain-that-does-not-exist-12345.com"
    );
    console.log("❌ Should have thrown NetworkError");
  } catch (error) {
    if (error instanceof NetworkError) {
      console.log("✅ NetworkError caught correctly");
      console.log(`   Message: ${error.message}`);
    } else {
      console.log("❌ Wrong error type:", error);
    }
  }
}

async function testAPIError() {
  console.log("\n=== Testing API Error ===");
  try {
    // This should return 404
    const response = await fetchWithTimeout("https://httpbin.org/status/404");
    await checkResponse(response);
    console.log("❌ Should have thrown APIError");
  } catch (error) {
    if (error instanceof APIError) {
      console.log("✅ APIError caught correctly");
      console.log(`   Message: ${error.message}`);
      console.log(`   Status: ${error.status}`);
    } else {
      console.log("❌ Wrong error type:", error);
    }
  }
}

async function testSuccessfulRequest() {
  console.log("\n=== Testing Successful Request ===");
  try {
    const response = await fetchWithTimeout("https://httpbin.org/get", {
      timeout: 10000
    });
    await checkResponse(response);
    const data = await response.json();
    console.log("✅ Successful request");
    console.log(`   URL: ${data.url}`);
  } catch (error) {
    console.log("❌ Should not have thrown error:", error);
  }
}

async function testRetryLogic() {
  console.log("\n=== Testing Retry Logic ===");
  let attempts = 0;
  try {
    await fetchWithRetry(
      async () => {
        attempts++;
        console.log(`   Attempt ${attempts}`);
        throw new NetworkError("Simulated network error");
      },
      {
        maxRetries: 2,
        retryDelay: 100
      }
    );
    console.log("❌ Should have thrown error after retries");
  } catch (error) {
    if (error instanceof NetworkError && attempts === 3) {
      console.log("✅ Retry logic worked correctly");
      console.log(`   Total attempts: ${attempts}`);
    } else {
      console.log("❌ Wrong behavior:", { error, attempts });
    }
  }
}

async function runTests() {
  console.log("Starting fetch-utils tests...\n");

  await testTimeoutError();
  await testNetworkError();
  await testAPIError();
  await testSuccessfulRequest();
  await testRetryLogic();

  console.log("\n=== All tests completed ===\n");
}

runTests();
