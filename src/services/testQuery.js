import { queryEmbeddings } from "./queryService.js";

async function runTest() {
    try {
        const query = "Como faço para controlar o estoque?";
        const results = await queryEmbeddings(query);

        console.log("Similarity Matches:", results.matches);
        console.log("\nGenerated Answer:", results.answer);
    } catch (error) {
        console.error('Error in runTest:', error);
    }
}

runTest();