import os
import matplotlib
# Use Agg backend to avoid GUI dependencies
matplotlib.use('Agg')
# Set the cache directory to shared memory
os.environ['MPLCONFIGDIR'] = '/dev/shm/matplotlib'