"""This script aims at testing some javascript modules using python and selenium"""
import sys, subprocess, os, time
try:
    import selenium
except ImportError:
    print("Installing Selenium")
    p = subprocess.Popen([sys.executable, "-m", "pip", "install", "-U", "selenium"])
    p.join()
    import selenium

from selenium import webdriver
from selenium.webdriver.common.keys import Keys

DRIVER = webdriver.Firefox

FILESTOFETCH = {
# https://github.com/mozilla/geckodriver/releases
webdriver.Firefox: "https://github.com/mozilla/geckodriver/releases/download/v0.26.0/geckodriver-v0.26.0-win64.zip",
# https://chromedriver.chromium.org/downloads
webdriver.Chrome: "https://chromedriver.storage.googleapis.com/83.0.4103.39/chromedriver_win32.zip"
}
# installing firefox driver
#   
#   
EXECUTABLEFOLDER = "drivers"
SCRIPTFOLDER = os.path.dirname(os.path.abspath(__file__))
JSFOLDER = os.path.dirname(SCRIPTFOLDER)

destfoldertopath = os.path.join(SCRIPTFOLDER, EXECUTABLEFOLDER)
try:
    if os.path.exists(destfoldertopath):
        print("Update PATH")
        os.environ["PATH"] = os.pathsep.join([os.environ["PATH"], destfoldertopath])
    driver = DRIVER()
except:
    if not os.path.exists(destfoldertopath):
        os.makedirs(destfoldertopath)
    import urllib.request, zipfile, io
    urltofetch = FILESTOFETCH.get(DRIVER)
    print("Fetching", urltofetch)
    filestream = urllib.request.urlopen(urltofetch)
    datatowrite = filestream.read()
    zfile = zipfile.ZipFile(io.BytesIO(datatowrite))
    zfile.extractall(destfoldertopath)
    os.environ["PATH"] = os.pathsep.join([os.environ["PATH"], destfoldertopath])
    driver = DRIVER()

# testing
print("Getting auth page")
driver.get("https://www.familysearch.org/auth/familysearch/login?fhf=true&returnUrl=%2F")
time.sleep(5)
elem = driver.find_element_by_id('userName')
username, password = open(os.path.join(SCRIPTFOLDER, "credentials.txt")).read().split()[:2]
elem.send_keys(username)
elem = driver.find_element_by_id('password')
elem.send_keys(password + Keys.RETURN)
print("Logged in")
time.sleep(5)
# check if cookies asking
iframes = driver.find_elements_by_tag_name("iframe")
if iframes:
    print("Accepting cookies")
    driver.switch_to.frame(iframes[0])
    # <a class="call" tabindex="0" role="button">Accepter et continuer</a>
    try:
        e = driver.find_element_by_partial_link_text("Accepter")
        e.click()
    except:
        print("No button Accepter")

driver.switch_to.parent_frame()

print("Going to person")
driver.get("https://www.familysearch.org/tree/person")

time.sleep(10)

print("Importing recursive-search.js")
with open(os.path.join(JSFOLDER, "recursive-search.js"), "r") as fin:
    content = fin.read()
#driver.execute_script()
print("Testing family-depth.js")
with open(os.path.join(JSFOLDER, "family-depth.js"), "r") as fin:
    print("result:", driver.execute_script(content + fin.read()))

# how to recuperate asynchronous results?
time.sleep(60)
print("Result:", driver.execute_script("return window.familydepthresult;"))

#time.sleep(60)
driver.quit()

    
    
