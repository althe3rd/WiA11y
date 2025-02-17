import { VIOLATION_WEIGHTS } from '../constants/scoreWeights';

export const calculateScore = (crawl) => {
  // If crawl hasn't started or no pages scanned yet, return null
  if (!crawl.status || crawl.status === 'pending' || !crawl.pagesScanned) {
    return '—';
  }
  
  // If no violations found and scan is complete, return 100
  if (crawl.violationsFound === 0 && crawl.status === 'completed') {
    return 100;
  }
  
  // Calculate weighted deductions based on average violations per page
  if (crawl.violationsByImpact) {
    const { critical, serious, moderate, minor } = crawl.violationsByImpact;
    const pagesScanned = crawl.pagesScanned || 1; // Prevent division by zero
    
    // Calculate average violations per page for each severity
    const avgCritical = critical / pagesScanned;
    const avgSerious = serious / pagesScanned;
    const avgModerate = moderate / pagesScanned;
    const avgMinor = minor / pagesScanned;
    
    // Calculate total deduction using averages
    const totalDeduction = 
      (avgCritical * VIOLATION_WEIGHTS.critical) +
      (avgSerious * VIOLATION_WEIGHTS.serious) +
      (avgModerate * VIOLATION_WEIGHTS.moderate) +
      (avgMinor * VIOLATION_WEIGHTS.minor);
      
    let score = Math.max(0, Math.round(100 - totalDeduction));
    return score;
  }
  
  return '—';
}; 