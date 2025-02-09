export const calculateScore = (crawl) => {
  // If crawl hasn't started or no pages scanned yet, return null
  if (!crawl.status || crawl.status === 'pending' || !crawl.pagesScanned) {
    return '—';
  }
  
  // If no violations found and scan is complete, return 100
  if (crawl.violationsFound === 0 && crawl.status === 'completed') {
    return 100;
  }
  
  // Weight violations by severity
  const deductions = {
    critical: 15.0,   // Critical issues have major impact
    serious: 0.6,     // ~0.6 points per serious violation
    moderate: 0.2,    // ~0.2 points per moderate violation
    minor: 0.1       // Minor issues have minimal impact
  };
  
  // Calculate weighted deductions
  if (crawl.violationsByImpact) {
    const { critical, serious, moderate, minor } = crawl.violationsByImpact;
    const totalDeduction = 
      (critical * deductions.critical) +
      (serious * deductions.serious) +
      (moderate * deductions.moderate) +
      (minor * deductions.minor);
      
    let score = Math.max(0, Math.round(100 - totalDeduction));
    return score;
  }
  
  return '—';
}; 