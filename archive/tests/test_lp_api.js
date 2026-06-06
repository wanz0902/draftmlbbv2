import fetch from 'node-fetch';

async function test() {
  try {
    const apiEndpoint = "https://liquipedia.net/mobilelegends/api.php";
    const params = new URLSearchParams({
      action: "parse",
      page: "MPL/Indonesia/Season_17/Statistics",
      prop: "text",
      format: "json",
    });

    const headers = {
      "User-Agent": "MLBB-Draft-Simulator-Builder/1.0 (dev@aistudio.build)",
    };

    console.log("Fetching live stats from Liquipedia...");
    const fetchResponse = await fetch(`${apiEndpoint}?${params.toString()}`, {
      headers,
    });
    console.log(fetchResponse.status);
    console.log(await fetchResponse.text());
  } catch(e) {
    console.log(e);
  }
}
test();
