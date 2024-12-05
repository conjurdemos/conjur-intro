require 'csv'

# Check if the directory argument is provided
if ARGV.length != 1
  puts 'Usage: ruby calculate_stats.rb <directory>'
  exit 1
end

# Get the directory from the input argument
directory = ARGV[0]

# Define the iterations and file paths
iterations = (1..10).to_a
files = ['01-preload.csv', '02-dryrun.csv', '03-load.csv']
output_files = ['01-preload-stats.csv', '02-dryrun-stats.csv', '03-load-stats.csv']

# Function to calculate statistics
def calculate_stats(data)
  avg = data.sum / data.size.to_f
  min = data.min
  max = data.max
  mean = data.sum / data.size.to_f
  { avg: avg, min: min, max: max, mean: mean }
end

# Function to calculate average growth rate
def calculate_growth_rate(data)
  growth_rates = []
  data.each_cons(2) do |a, b|
    growth_rates << ((b - a) / a.to_f) * 100
  end
  growth_rates.sum / growth_rates.size.to_f
end

# Process each file
files.each_with_index do |file, index|
  all_data = Hash.new { |hash, key| hash[key] = [] }

  # Read data from each iteration
  iterations.each do |iteration|
    file_path = "#{directory}/iteration-#{iteration}/#{file}"
    CSV.foreach(file_path, headers: false) do |row|
      key = row[0]
      value = row[1].to_f
      all_data[key] << value
    end
  end

  # Calculate statistics and growth rates
  stats = {}
  all_data.each do |key, values|
    stats[key] = calculate_stats(values)
    stats[key][:growth_rate] = calculate_growth_rate(values)
  end

  # Write results to output file
  CSV.open(output_files[index], 'w') do |csv|
    csv << ['Metric', 'Average', 'Min', 'Max', 'Mean', 'Growth Rate']
    stats.each do |key, stat|
      csv << [key, stat[:avg], stat[:min], stat[:max], stat[:mean], stat[:growth_rate]]
    end
  end
end

puts 'Statistics calculated and written to output files.'
