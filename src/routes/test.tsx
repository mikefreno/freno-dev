import { createSignal, For, Show } from "solid-js";

type EndpointTest = {
  name: string;
  router: string;
  procedure: string;
  method: "query" | "mutation";
  input?: object;
  description: string;
};

const endpoints: EndpointTest[] = [
  // JSON Service (no input needed)
  {
    name: "Get Attacks",
    router: "lineage.jsonService",
    procedure: "attacks",
    method: "query",
    description: "Get all attack data",
  },
  {
    name: "Get Conditions",
    router: "lineage.jsonService",
    procedure: "conditions",
    method: "query",
    description: "Get all condition data",
  },
  {
    name: "Get Dungeons",
    router: "lineage.jsonService",
    procedure: "dungeons",
    method: "query",
    description: "Get all dungeon data",
  },
  {
    name: "Get Enemies",
    router: "lineage.jsonService",
    procedure: "enemies",
    method: "query",
    description: "Get all enemy data",
  },
  {
    name: "Get Items",
    router: "lineage.jsonService",
    procedure: "items",
    method: "query",
    description: "Get all item data",
  },
  {
    name: "Get Misc",
    router: "lineage.jsonService",
    procedure: "misc",
    method: "query",
    description: "Get all misc data",
  },

  // Misc
  {
    name: "Offline Secret",
    router: "lineage.misc",
    procedure: "offlineSecret",
    method: "query",
    description: "Get offline serialization secret",
  },

  // PvP
  {
    name: "Get Opponents",
    router: "lineage.pvp",
    procedure: "getOpponents",
    method: "query",
    description: "Get 3 random PvP opponents",
  },
];

export default function TestPage() {
  const [results, setResults] = createSignal<Record<string, any>>({});
  const [loading, setLoading] = createSignal<Record<string, boolean>>({});
  const [errors, setErrors] = createSignal<Record<string, string>>({});

  const testEndpoint = async (endpoint: EndpointTest) => {
    const key = `${endpoint.router}.${endpoint.procedure}`;
    setLoading({ ...loading(), [key]: true });
    setErrors({ ...errors(), [key]: "" });

    try {
      const url = `/api/trpc/${endpoint.router}.${endpoint.procedure}`;
      const response = await fetch(url, {
        method: endpoint.method === "query" ? "GET" : "POST",
        headers: endpoint.input ? { "Content-Type": "application/json" } : {},
        body: endpoint.input ? JSON.stringify(endpoint.input) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      setResults({ ...results(), [key]: data });
    } catch (error: any) {
      setErrors({ ...errors(), [key]: error.message });
    } finally {
      setLoading({ ...loading(), [key]: false });
    }
  };

  const testAll = async () => {
    for (const endpoint of endpoints) {
      await testEndpoint(endpoint);
      // Small delay to avoid overwhelming the server
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  };

  return (
    <main class="min-h-screen bg-gray-100 p-8">
      <div class="max-w-6xl mx-auto">
        <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 class="text-3xl font-bold mb-2">Lineage API Testing Dashboard</h1>
          <p class="text-gray-600 mb-4">Test all migrated tRPC endpoints</p>

          <button
            onClick={testAll}
            class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded transition"
          >
            Test All Endpoints
          </button>
        </div>

        <div class="space-y-4">
          <For each={endpoints}>
            {(endpoint) => {
              const key = `${endpoint.router}.${endpoint.procedure}`;
              return (
                <div class="bg-white rounded-lg shadow p-6">
                  <div class="flex justify-between items-start mb-3">
                    <div>
                      <h3 class="text-xl font-semibold">{endpoint.name}</h3>
                      <p class="text-sm text-gray-600">
                        {endpoint.description}
                      </p>
                      <code class="text-xs bg-gray-100 px-2 py-1 rounded mt-1 inline-block">
                        {key}
                      </code>
                    </div>
                    <button
                      onClick={() => testEndpoint(endpoint)}
                      disabled={loading()[key]}
                      class="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded transition"
                    >
                      {loading()[key] ? "Testing..." : "Test"}
                    </button>
                  </div>

                  <Show when={errors()[key]}>
                    <div class="bg-red-50 border border-red-200 rounded p-3 mb-3">
                      <p class="text-red-800 text-sm font-semibold">Error:</p>
                      <p class="text-red-600 text-sm">{errors()[key]}</p>
                    </div>
                  </Show>

                  <Show when={results()[key]}>
                    <div class="bg-gray-50 rounded p-3">
                      <p class="text-sm font-semibold text-gray-700 mb-2">
                        Response:
                      </p>
                      <pre class="text-xs overflow-auto max-h-60 bg-gray-900 text-green-400 p-3 rounded">
                        {JSON.stringify(results()[key], null, 2)}
                      </pre>
                    </div>
                  </Show>
                </div>
              );
            }}
          </For>
        </div>

        <div class="bg-white rounded-lg shadow-lg p-6 mt-6">
          <h2 class="text-2xl font-bold mb-4">Testing Instructions</h2>

          <div class="space-y-4 text-gray-700">
            <div>
              <h3 class="font-semibold text-lg mb-2">
                ✅ Endpoints on This Page
              </h3>
              <p>These endpoints require no authentication or setup:</p>
              <ul class="list-disc ml-6 mt-2 space-y-1">
                <li>All JSON Service endpoints (game data)</li>
                <li>Offline Secret</li>
                <li>Get PvP Opponents</li>
              </ul>
            </div>

            <div>
              <h3 class="font-semibold text-lg mb-2">
                🔐 Manual Testing Required
              </h3>
              <p class="mb-2">
                For authentication-required endpoints, use curl or Postman:
              </p>

              <div class="bg-gray-900 text-green-400 p-4 rounded text-xs space-y-2">
                <div>
                  <p class="text-gray-400"># Email Registration</p>
                  <code>
                    curl -X POST
                    http://localhost:3001/api/trpc/lineage.auth.emailRegistration
                    \
                  </code>
                  <br />
                  <code> -H "Content-Type: application/json" \</code>
                  <br />
                  <code>
                    {" "}
                    -d '{"{"}
                    "email":"test@example.com","password":"pass123","password_conf":"pass123"
                    {"}"}'
                  </code>
                </div>

                <div class="mt-4">
                  <p class="text-gray-400"># Get Items (query)</p>
                  <code>
                    curl
                    http://localhost:3000/api/trpc/lineage.jsonService.items
                  </code>
                </div>
              </div>
            </div>

            <div>
              <h3 class="font-semibold text-lg mb-2">📚 Full Documentation</h3>
              <p>
                See <code>tasks/lineage-testing-guide.md</code> for complete
                testing instructions including:
              </p>
              <ul class="list-disc ml-6 mt-2 space-y-1">
                <li>All 27 endpoint examples</li>
                <li>Authentication workflows</li>
                <li>Database verification queries</li>
                <li>Integration testing scenarios</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
