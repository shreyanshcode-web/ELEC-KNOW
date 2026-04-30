document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('educationForm');
  const chatResponse = document.getElementById('chatResponse');
  const submitBtn = document.getElementById('submitBtn');
  
  // Basic mock auth state - typically this integrates with Firebase Client SDK
  let authToken = 'mock_jwt_for_development';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const query = document.getElementById('queryInput').value;
    const knowledgeLevel = document.getElementById('knowledgeLevel').value;
    
    // UI state loading
    submitBtn.disabled = true;
    submitBtn.textContent = 'Analyzing with Vertex AI...';
    chatResponse.innerHTML = '<p class="placeholder-text">Generating insights...</p>';
    
    try {
      const res = await fetch('/api/education', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ query, knowledgeLevel })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch insights.');
      }
      
      // Simple markdown-like display to HTML
      displayResponse(data.data);
      
    } catch (error) {
      chatResponse.innerHTML = `<p style="color: var(--error-color)">Error: ${error.message}</p>`;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Ask AI Educator';
    }
  });

  /**
   * Helper function to convert markdown structure from Gemini to HTML
   * Real production app would use marked.js or similar
   */
  function displayResponse(text) {
    let html = text
      .replace(/^### (.*$)/gim, '<h4>$1</h4>')
      .replace(/^## (.*$)/gim, '<h3>$1</h3>')
      .replace(/^\* (.*$)/gim, '<ul><li>$1</li></ul>')
      .replace(/\n\n/g, '</p><p>');
      
    html = `<p>${html}</p>`;
    
    // Cleanup nested list structures correctly
    html = html.replace(/<\/ul>\s*<ul>/g, '');

    chatResponse.innerHTML = html;
  }
});
