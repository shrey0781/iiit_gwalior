// ===== Chart.js Configuration =====
function initIncomeChart(incomeData) {
  const ctx = document.getElementById('incomeChart');
  if (!ctx) return;

  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const harvestMonths = [2, 9, 10]; // Mar, Oct, Nov (0-indexed)

  const backgroundColors = incomeData.map((_, index) => {
    return harvestMonths.includes(index) ? '#ffc107' : '#4caf50';
  });

  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: monthLabels,
      datasets: [{
        label: 'Expected Monthly Income (₹)',
        data: incomeData,
        backgroundColor: backgroundColors,
        borderColor: '#2e7d32',
        borderWidth: 2,
        borderRadius: 8,
        hoverBackgroundColor: '#1b5e20'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: {
            font: { family: "'Poppins', sans-serif", size: 14, weight: '600' },
            color: '#333',
            padding: 15
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            font: { family: "'Poppins', sans-serif", size: 12, weight: '500' },
            color: '#666',
            callback: function(value) {
              return '₹' + value.toLocaleString();
            }
          },
          grid: { color: '#e0e0e0' }
        },
        x: {
          ticks: {
            font: { family: "'Poppins', sans-serif", size: 12, weight: '500' },
            color: '#666'
          },
          grid: { display: false }
        }
      }
    }
  });

  return chart;
}

// ===== Form Validation =====
function validateForm() {
  const name = document.getElementById('name').value.trim();
  const district = document.getElementById('district').value.trim();
  const crop = document.getElementById('crop').value;
  const land = document.getElementById('land').value;
  const loan = document.getElementById('loan').value;
  const duration = document.getElementById('duration').value;

  if (!name) {
    alert('कृपया अपना नाम दर्ज करें / Please enter your name');
    return false;
  }

  if (!district) {
    alert('कृपया जिला चुनें / Please enter district');
    return false;
  }

  if (!crop) {
    alert('कृपया फसल चुनें / Please select crop');
    return false;
  }

  if (!land || land <= 0) {
    alert('कृपया सही भूमि आकार दर्ज करें / Please enter valid land size');
    return false;
  }

  if (!loan || loan <= 0) {
    alert('कृपया सही ऋण राशि दर्ज करें / Please enter valid loan amount');
    return false;
  }

  if (!duration) {
    alert('कृपया ऋण अवधि चुनें / Please select loan duration');
    return false;
  }

  return true;
}

// ===== Scroll Animations =====
function initScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
  };

  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in');
      }
    });
  }, observerOptions);

  document.querySelectorAll('.feature-card, .info-card, .step').forEach(el => {
    observer.observe(el);
  });
}

// ===== Initialize on Page Load =====
document.addEventListener('DOMContentLoaded', function() {
  initScrollAnimations();

  // Initialize income chart if on result page
  const chartContainer = document.getElementById('incomeChart');
  if (chartContainer) {
    // Income data should be passed from server via data attribute
    const incomeDataElement = document.querySelector('[data-income-months]');
    if (incomeDataElement) {
      const incomeData = JSON.parse(incomeDataElement.dataset.incomeMonths);
      initIncomeChart(incomeData);
    }
  }

  // Form submission handler
  const form = document.querySelector('form');
  if (form) {
    form.addEventListener('submit', function(e) {
      if (!validateForm()) {
        e.preventDefault();
      }
    });
  }
});

// ===== Number Formatter =====
function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0
  }).format(value);
}

// ===== Progress Bar Animation =====
function animateProgressBar(element, targetWidth) {
  let currentWidth = 0;
  const increment = targetWidth / 50;

  const timer = setInterval(() => {
    if (currentWidth >= targetWidth) {
      clearInterval(timer);
    } else {
      currentWidth += increment;
      element.style.width = Math.min(currentWidth, targetWidth) + '%';
    }
  }, 20);
}

// ===== Smooth Scroll =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});
