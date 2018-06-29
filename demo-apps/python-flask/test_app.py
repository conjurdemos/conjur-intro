from flask import Flask
import os

app = Flask(__name__)

@app.route('/')
def root():
    return os.getenv('DB_PASSWORD')