import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function PriceChart() {
  const router = useRouter();
  const [neighbors, setNeighbors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortType, setSortType] = useState('largestGrants');
  const [showOnlyWithStay, setShowOnlyWithStay] = useState(false);
  const [showProjectedTotal, setShowProjectedTotal] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [urlParamsApplied, setUrlParamsApplied] = useState(false);

  // Apply URL parameters when router is ready
  useEffect(() => {
    if (!router.isReady || urlParamsApplied) return;
    
    // Get parameters from URL
    const { sort, onlyWithStay, projected } = router.query;
    
    // Apply sort parameter if valid
    const validSortTypes = ['largestGrants', 'smallestGrants', 'largestCost', 'smallestCost', 'bestEfficiency', 'worstEfficiency'];
    if (sort && validSortTypes.includes(sort)) {
      setSortType(sort);
    }
    
    // Apply filter parameters
    if (onlyWithStay === 'true') {
      setShowOnlyWithStay(true);
    }
    
    if (projected === 'true') {
      setShowProjectedTotal(true);
    }
    
    setUrlParamsApplied(true);
  }, [router.isReady, router.query, urlParamsApplied]);

  // Update URL when filters change - but only after initial URL params are applied
  const updateUrlParams = (newSortType, newShowOnlyWithStay, newShowProjectedTotal) => {
    // Skip URL updates until initial URL parameters are applied
    if (!urlParamsApplied) return;
    
    const query = {};
    
    // Only add parameters that are not default values
    if (newSortType !== 'largestGrants') {
      query.sort = newSortType;
    }
    
    if (newShowOnlyWithStay) {
      query.onlyWithStay = 'true';
    }
    
    if (newShowProjectedTotal) {
      query.projected = 'true';
    }
    
    // Compare current URL params with new ones to avoid unnecessary updates
    const currentQuery = router.query;
    const currentSort = currentQuery.sort || 'largestGrants';
    const currentOnlyWithStay = currentQuery.onlyWithStay === 'true';
    const currentProjected = currentQuery.projected === 'true';
    
    // Only update URL if something changed
    if (
      currentSort !== (query.sort || 'largestGrants') ||
      currentOnlyWithStay !== !!query.onlyWithStay ||
      currentProjected !== !!query.projected
    ) {
      // Update URL without refreshing the page
      router.push({
        pathname: router.pathname,
        query
      }, undefined, { shallow: true });
    }
  };

  // Handle sort type change
  const handleSortTypeChange = (newSortType) => {
    setSortType(newSortType);
    updateUrlParams(newSortType, showOnlyWithStay, showProjectedTotal);
  };

  // Handle show only with stay change
  const handleShowOnlyWithStayChange = (checked) => {
    setShowOnlyWithStay(checked);
    updateUrlParams(sortType, checked, showProjectedTotal);
  };

  // Toggle projected total and force recalculation
  const toggleProjectedTotal = (checked) => {
    setShowProjectedTotal(checked);
    // Force a recalculation by incrementing forceUpdate
    setForceUpdate(prev => prev + 1);
    updateUrlParams(sortType, showOnlyWithStay, checked);
  };

  useEffect(() => {
    const fetchNeighborsCosts = async () => {
      try {
        const response = await fetch(`/api/getNeighborsCosts`);
        const data = await response.json();
        // Filter out neighbors without names or Slack handles
        const filteredNeighbors = data.neighbors.filter(
          neighbor => neighbor.fullName || neighbor.slackFullName
        );
        
        // Check if we're getting date information from the API
        const sampleNeighbor = filteredNeighbors[0];
        if (sampleNeighbor) {
          console.log("Sample neighbor data:", 
            JSON.stringify({
              name: sampleNeighbor.fullName || sampleNeighbor.slackFullName,
              rentCost: sampleNeighbor.rentCost,
              foodCost: sampleNeighbor.foodCost,
              startDate: sampleNeighbor.startDate,
              endDate: sampleNeighbor.endDate
            })
          );
        }
        
        // Look specifically for Armand
        const armand = filteredNeighbors.find(n => 
          (n.fullName && n.fullName.includes("Armand")) || 
          (n.slackFullName && n.slackFullName.includes("Armand"))
        );
        
        if (armand) {
          console.log("Armand's data:", JSON.stringify({
            name: armand.fullName || armand.slackFullName,
            rentCost: armand.rentCost,
            foodCost: armand.foodCost,
            startDate: armand.startDate,
            endDate: armand.endDate,
            country: armand.country,
            approvedFlightStipend: armand.approvedFlightStipend,
            stipendAmount: armand.stipendAmount
          }));
        }
        
        setNeighbors(filteredNeighbors);
      } catch (err) {
        setError('Failed to load neighbors cost data');
        console.error('Error fetching neighbors costs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNeighborsCosts();
  }, []);

  // Reset cost breakdown cache when forceUpdate changes
  useEffect(() => {
    if (forceUpdate > 0) {
      console.log("Forcing recalculation of costs...");
      // Clear cached cost breakdowns
      neighbors.forEach(neighbor => {
        delete neighbor.costBreakdown;
      });
    }
  }, [forceUpdate, neighbors]);

  // Calculate spend efficiency (cost per hour)
  const getSpendEfficiency = (neighbor) => {
    const totalCost = calculateCost(neighbor);
    // If weightedGrantsContribution is 0, treat it as 0.1 hour (making it highly inefficient)
    const weightedHours = neighbor.weightedGrantsContribution > 0 
      ? neighbor.weightedGrantsContribution * 10 
      : 1.0; // 0.1 is equivalent to 1/10 of an hour, making it very inefficient
    
    return totalCost / weightedHours;
  };

  // Calculate cost based on the selected option (actual or projected)
  const calculateCost = (neighbor) => {
    // Check if we have a cached calculation and forceUpdate hasn't changed
    if (neighbor.costBreakdown && neighbor._lastForceUpdate === forceUpdate) {
      return neighbor.costBreakdown.total;
    }
    
    let baseCost = 0;
    let rentCost = 0;
    let foodCost = 0;
    let days = 0;
    let startDateStr = '';
    let endDateStr = '';
    let isProjected = false;
    let debugInfo = '';
    
    const today = new Date();
    
    // Special debugging for Armand
    const isArmand = (neighbor.fullName && neighbor.fullName.includes("Armand")) || 
                    (neighbor.slackFullName && neighbor.slackFullName.includes("Armand"));
    
    if (isArmand) {
      debugInfo += `*** DEBUGGING ARMAND'S CALCULATION ***\n`;
      debugInfo += `showProjectedTotal: ${showProjectedTotal}\n`;
      debugInfo += `forceUpdate: ${forceUpdate}\n`;
    }
    
    // Check if we have stay dates from the neighbor object directly
    if (neighbor.startDate && neighbor.endDate) {
      const startDate = new Date(neighbor.startDate);
      const endDate = new Date(neighbor.endDate);
      
      // Store date strings for the breakdown
      startDateStr = startDate.toLocaleDateString();
      endDateStr = endDate.toLocaleDateString();
      
      debugInfo += `Start: ${startDateStr}, End: ${endDateStr}, Today: ${today.toLocaleDateString()}\n`;
      debugInfo += `ShowProjected: ${showProjectedTotal}\n`;
      
      // If stay hasn't started yet, return 0 for costs
      if (startDate > today) {
        if (showProjectedTotal) {
          // For projected totals, calculate the full stay even if it hasn't started yet
          days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
          isProjected = true;
          debugInfo += `Future stay, projected: ${days} days\n`;
        } else {
          // For actual costs, if stay hasn't started, costs are 0
          days = 0;
          debugInfo += `Future stay, not started: 0 days\n`;
        }
      } else {
        // Stay has started
        // Determine end point based on showProjectedTotal setting
        const endPoint = showProjectedTotal && endDate > today ? endDate : 
                        (today < endDate ? today : endDate);
        
        // Calculate days elapsed from start to end point
        days = Math.ceil((endPoint - startDate) / (1000 * 60 * 60 * 24)) + 1;
        
        // Mark as projected if we're using the future end date
        isProjected = showProjectedTotal && endDate > today;
        
        debugInfo += `Using end point: ${endPoint.toLocaleDateString()}\n`;
        debugInfo += `Days calculated: ${days}, isProjected: ${isProjected}\n`;
        
        if (isArmand) {
          const actualDays = Math.ceil(((today < endDate ? today : endDate) - startDate) / (1000 * 60 * 60 * 24)) + 1;
          const projectedDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
          
          debugInfo += `Actual days to today/end: ${actualDays}\n`;
          debugInfo += `Projected total days: ${projectedDays}\n`;
          debugInfo += `Is end date in future? ${endDate > today}\n`;
          
          // Log to console for debugging
          console.log(`Armand calculation:`, {
            showProjectedTotal,
            startDate: startDate.toLocaleDateString(),
            endDate: endDate.toLocaleDateString(),
            today: today.toLocaleDateString(),
            endPoint: endPoint.toLocaleDateString(),
            actualDays,
            projectedDays,
            calculatedDays: days,
            isProjected
          });
        }
      }
      
      // Calculate costs based on days
      rentCost = days * 25; // Updated from $20 to $25 per day
      foodCost = days * (150 / 7);
      baseCost = rentCost + foodCost;
    } else if (neighbor.rentCost > 0 || neighbor.foodCost > 0) {
      // If no stay dates available but we have costs, use those
      rentCost = neighbor.rentCost;
      foodCost = neighbor.foodCost;
      baseCost = rentCost + foodCost;
      debugInfo += `No stay dates, using provided costs: Rent=$${rentCost}, Food=$${foodCost}\n`;
    }
    
    // Always add flight stipend if approved
    const stipendAmount = neighbor.approvedFlightStipend && neighbor.stipendAmount ? neighbor.stipendAmount : 0;
    baseCost += stipendAmount;
    
    // Store cost breakdown on neighbor object for alert
    neighbor.costBreakdown = {
      rent: rentCost,
      food: foodCost,
      stipend: stipendAmount,
      total: baseCost,
      days: days,
      startDate: startDateStr,
      endDate: endDateStr,
      country: neighbor.country || 'Unknown',
      isProjected: isProjected,
      debugInfo: debugInfo
    };
    
    // Store the forceUpdate value to know when to recalculate
    neighbor._lastForceUpdate = forceUpdate;
    
    return baseCost;
  };

  // Show cost breakdown alert
  const showCostBreakdown = (neighbor) => {
    let breakdown = neighbor.costBreakdown;
    if (!breakdown) {
      // If breakdown doesn't exist, calculate it now
      calculateCost(neighbor);
      if (!neighbor.costBreakdown) {
        alert("No cost breakdown available for this neighbor.");
        return;
      }
      breakdown = neighbor.costBreakdown;
    }
    
    let message = `Cost Breakdown for ${neighbor.fullName || neighbor.slackFullName || neighbor.slackId || "unnamed"}:\n`;
    
    // // Add debugging info (only in development)
    // if (process.env.NODE_ENV === 'development' && breakdown.debugInfo) {
    //   message += `DEBUG INFO:\n${breakdown.debugInfo}\n`;
    // }
    
    // Add stay details if available
    if (breakdown.days > 0) {
      // Indicate if this is a projected cost
      if (breakdown.isProjected) {
        message += `Projected total stay duration: ${breakdown.days} days`;
      } else {
        message += `Current stay duration until today: ${breakdown.days} days`;
      }
      
      if (breakdown.startDate && breakdown.endDate) {
        message += ` (${breakdown.startDate} to ${breakdown.isProjected ? 'projected end ' : ''}${breakdown.endDate})\n`;
      } else {
        message += '\n';
      }
      message += `- Rent: $${breakdown.rent.toFixed(0)} (${breakdown.days} days × $25/day = $${(breakdown.days * 25).toFixed(0)})\n`;
      message += `- Food: $${breakdown.food.toFixed(0)} (${breakdown.days} days × $${(150/7).toFixed(2)}/day = $${(breakdown.days * (150/7)).toFixed(0)})\n`;
    } else if (neighbor.rentCost > 0 || neighbor.foodCost > 0) {
      // If we have costs but no days info, try to calculate days from the costs
      const estimatedRentDays = neighbor.rentCost > 0 ? Math.round(neighbor.rentCost / 25) : 0;
      const estimatedFoodDays = neighbor.foodCost > 0 ? Math.round(neighbor.foodCost / (150/7)) : 0;
      
      if (estimatedRentDays > 0) {
        message += `- Rent: $${breakdown.rent.toFixed(0)} (approx. ${estimatedRentDays} days × $25/day)\n`;
      } else {
        message += `- Rent: $${breakdown.rent.toFixed(0)}\n`;
      }
      
      if (estimatedFoodDays > 0) {
        message += `- Food: $${breakdown.food.toFixed(0)} (approx. ${estimatedFoodDays} days × $${(150/7).toFixed(2)}/day)\n`;
      } else {
        message += `- Food: $${breakdown.food.toFixed(0)}\n`;
      }
    } else {
      message += `- Rent: $${breakdown.rent.toFixed(0)}\n`;
      message += `- Food: $${breakdown.food.toFixed(0)}\n`;
    }
    
    // Add flight stipend details
    if (breakdown.stipend > 0) {
      message += `- Flight Stipend: $${breakdown.stipend.toFixed(0)} (${breakdown.country === 'US' ? 'US' : 'International'} rate: $${breakdown.country === 'US' ? '500' : '750'})\n`;
    } else {
      message += `- Flight Stipend: $0 (Not approved)\n`;
    }
    
    message += `- Total: $${breakdown.total.toFixed(0)}`;
    
    // Use window.alert to ensure it works
    window.alert(message);
    
    // Log to console for debugging
    console.log("Showing cost breakdown:", message);
  };

  // Filter neighbors based on selected filters
  const filteredNeighbors = [...neighbors].filter(neighbor => {
    // Apply stay filter if enabled
    if (showOnlyWithStay) {
      // Only show neighbors with a confirmed stay that has already started
      const today = new Date();
      
      // Check if they have a start date and it's in the past or today
      if (neighbor.startDate) {
        const startDate = new Date(neighbor.startDate);
        // Only include if the stay has started and has a cost
        const totalCost = calculateCost(neighbor);
        return startDate <= today && totalCost > 0;
      }
      
      // If no start date but has cost, include them (legacy data)
      const totalCost = calculateCost(neighbor);
      return totalCost > 0;
    }
    
    // When sorting by efficiency, include neighbors with cost even if they have 0 weighted grants
    if (sortType === 'bestEfficiency' || sortType === 'worstEfficiency') {
      const totalCost = calculateCost(neighbor);
      // Only require a cost > 0, allow 0 weighted grants (will show as inefficient)
      return totalCost > 0;
    }
    
    return true;
  });

  const sortedNeighbors = [...filteredNeighbors].sort((a, b) => {
    if (sortType === 'largestGrants') {
      return b.weightedGrantsContribution - a.weightedGrantsContribution;
    } else if (sortType === 'smallestGrants') {
      return a.weightedGrantsContribution - b.weightedGrantsContribution;
    } else if (sortType === 'largestCost') {
      return calculateCost(b) - calculateCost(a);
    } else if (sortType === 'smallestCost') {
      return calculateCost(a) - calculateCost(b);
    } else if (sortType === 'bestEfficiency') {
      // Lower cost per hour is better efficiency
      const efficiencyA = getSpendEfficiency(a);
      const efficiencyB = getSpendEfficiency(b);
      // Handle infinity or NaN cases
      if (!isFinite(efficiencyA)) return 1;
      if (!isFinite(efficiencyB)) return -1;
      return efficiencyA - efficiencyB;
    } else if (sortType === 'worstEfficiency') {
      // Higher cost per hour is worse efficiency
      const efficiencyA = getSpendEfficiency(a);
      const efficiencyB = getSpendEfficiency(b);
      // Handle infinity or NaN cases
      if (!isFinite(efficiencyA)) return -1;
      if (!isFinite(efficiencyB)) return 1;
      return efficiencyB - efficiencyA;
    }
    return 0;
  });

  // Calculate total grants
  const totalWeightedGrants = neighbors.reduce((sum, neighbor) => sum + (neighbor.weightedGrantsContribution || 0), 0);

  const breadcrumbItems = [
    { label: "Adventure Time", href: "/" },
    { label: "Neighborhood", href: "/neighborhood" },
    { label: "Price Chart", href: "/neighborhood/price-chart" }
  ];

  // Check if we need to fix the date information in the neighbors data
  useEffect(() => {
    if (!loading && neighbors.length > 0) {
      // The issue might be that we're not getting proper date information from the API
      // Let's check if any neighbors have startDate and endDate properties
      const hasDates = neighbors.some(n => n.startDate && n.endDate);
      
      if (!hasDates) {
        console.log("No date information found in neighbors data. Attempting to fix...");
        
        // We need to extract date information from the stay records
        const fixedNeighbors = neighbors.map(neighbor => {
          // Check if this neighbor has rentCost or foodCost but no dates
          if ((neighbor.rentCost > 0 || neighbor.foodCost > 0) && (!neighbor.startDate || !neighbor.endDate)) {
            // Try to extract dates from the API response
            if (neighbor.stay && neighbor.stay.length > 0) {
              const stayId = neighbor.stay[0]; // Use the first stay
              console.log(`Neighbor ${neighbor.fullName || neighbor.slackId} has stay ID: ${stayId}`);
            }
          }
          return neighbor;
        });
      }
    }
  }, [neighbors, loading]);

  // Generate a shareable URL with current settings
  const generateShareableUrl = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams();
    
    if (sortType !== 'largestGrants') {
      params.append('sort', sortType);
    }
    
    if (showOnlyWithStay) {
      params.append('onlyWithStay', 'true');
    }
    
    if (showProjectedTotal) {
      params.append('projected', 'true');
    }
    
    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  };

  // Copy shareable link to clipboard
  const copyShareableLink = () => {
    const shareableUrl = generateShareableUrl();
    navigator.clipboard.writeText(shareableUrl)
      .then(() => {
        alert('Shareable link copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy link:', err);
        alert('Failed to copy link. Please try again.');
      });
  };

  return (
    <>
      <Head>
        <title>Price Chart - Adventure Time</title>
        <meta name="description" content="View weighted grants for contributors in the neighborhood" />
      </Head>
      <div>
        <Breadcrumbs items={breadcrumbItems} />
        <h1>Neighborhood Price Chart</h1>
        <h2>Total Weighted Grants for Neighborhood: {totalWeightedGrants.toFixed(0)}</h2>
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8 }}>
            <label htmlFor="sortType">Sort by: </label>
            <select
              id="sortType"
              value={sortType}
              onChange={e => handleSortTypeChange(e.target.value)}
            >
              <option value="largestGrants">Most weighted grants</option>
              <option value="smallestGrants">Fewest weighted grants</option>
              <option value="largestCost">Highest total cost</option>
              <option value="smallestCost">Lowest total cost</option>
              <option value="bestEfficiency">Best spend efficiency</option>
              <option value="worstEfficiency">Worst spend efficiency</option>
            </select>
          </div>
          
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={showOnlyWithStay}
                onChange={e => handleShowOnlyWithStayChange(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Show only neighbors with stays
            </label>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={showProjectedTotal}
                onChange={e => toggleProjectedTotal(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Project Total Spend of Stay
            </label>
          </div>

        </div>
        
        {loading && <p>Loading neighbors cost data...</p>}
        {error && <p>{error}</p>}
        
        {!loading && !error && (
          <ol>
            {sortedNeighbors.map((neighbor) => {
              const totalCost = calculateCost(neighbor);
              const hasCost = totalCost > 0;
              const spendEfficiency = getSpendEfficiency(neighbor);
              const hasEfficiency = hasCost; // Show efficiency for all with cost, even if weightedGrantsContribution is 0
              const hasStipend = neighbor.approvedFlightStipend && neighbor.stipendAmount > 0;
              
              return (
                <li key={neighbor.id}>
                  <Link href={`/neighborhood/${neighbor.slackId}`}>
                    {neighbor.fullName || neighbor.slackFullName || neighbor.slackId || "unnamed"}
                  </Link>
                  {" "}
                  <span>({neighbor.weightedGrantsContribution.toFixed(0)} Weighted Grants)</span>
                  {hasCost && (
                    <span 
                      title="Click for cost breakdown"
                      onClick={(e) => {
                        e.preventDefault(); // Prevent any navigation
                        e.stopPropagation(); // Stop event bubbling
                        showCostBreakdown(neighbor);
                      }}
                      style={{ cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      {" "}(${totalCost.toFixed(0)} totalCost)
                    </span>
                  )}
                  {hasEfficiency && (
                    <span> (${spendEfficiency.toFixed(2)}/hr spendEfficiency)</span>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </>
  );
} 