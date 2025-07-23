export const waitForAnnouncement = async (text: string, timeout = 1000): Promise<boolean> => {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      const liveRegions = document.querySelectorAll('[aria-live]');
      const announced = Array.from(liveRegions).some(region => 
        region.textContent?.includes(text)
      );
      
      if (announced || Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        resolve(announced);
      }
    }, 100);
  });
};