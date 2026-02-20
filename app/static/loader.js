async function showLoaderWhile(promise) {
  // Show loader
  document.getElementById("loader-overlay").style.display = "flex";
  showFPALoader()

  try {
    // Wait for API (or any async process)
    const result = await promise;
    return result;
  } catch (err) {
    console.error("API Error:", err);
    throw err;
  } finally {
    // Hide loader after API completes (success or error)
    document.getElementById("loader-overlay").style.display = "none";
  }
}

// Loaders
function showFPALoader() {
    document.getElementById("loader-overlay").style.display = "flex";

    const letters = document.querySelectorAll('.letter');
    
    // Function to animate each letter
    function animateLetter(letter, delay) {
        setTimeout(() => {
            // Fade in
            letter.style.opacity = '1';
            
            // Add rotation and shaking animation after a small delay
            setTimeout(() => {
                letter.classList.add('animate');
            }, 200);
        }, delay);
    }
    
    animateLetter(letters[0], 1);  // F
    animateLetter(letters[1], 450); // P (after F animation completes)
    animateLetter(letters[2], 750); // A (after P animation completes)

}