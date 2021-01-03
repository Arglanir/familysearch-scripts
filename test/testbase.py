"""This script aims at testing some javascript modules using python and selenium"""
import sys, subprocess, os, time, contextlib, random
try:
    import selenium
except ImportError:
    print("Installing Selenium")
    p = subprocess.Popen([sys.executable, "-m", "pip", "install", "-U", "selenium"],
                         stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    print(p.communicate())
    import selenium

from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import JavascriptException

DRIVER = webdriver.Firefox
def DRIVERCREATION():
    from selenium.webdriver.firefox.options import Options
    options = Options()
    #options.headless = True
    profile = webdriver.FirefoxProfile()
    profile.set_preference("browser.helperApps.neverAsk.saveToDisk", "text/plain,text/html")
    profile.set_preference("browser.download.folderLis", "1")
    return DRIVER(firefox_profile=profile, options=options)

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
CURRENTDRIVER = None

@contextlib.contextmanager
def getFamilySearchDriver(quit_at_end=True):
    global CURRENTDRIVER
    destfoldertopath = os.path.join(SCRIPTFOLDER, EXECUTABLEFOLDER)
    try:
        if os.path.exists(destfoldertopath):
            print("Update PATH")
            os.environ["PATH"] = os.pathsep.join([os.environ["PATH"], destfoldertopath])
        driver = DRIVERCREATION()
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
        driver = DRIVERCREATION()

    # testing
    print("Getting auth page")
    driver.get("https://www.familysearch.org/auth/familysearch/login?fhf=true&returnUrl=%2F")
    niceCountDown(5)
    elem = driver.find_element_by_id('userName')
    username, password = open(os.path.join(SCRIPTFOLDER, "credentials.txt")).read().split()[:2]
    elem.send_keys(username)
    elem = driver.find_element_by_id('password')
    elem.send_keys(password + Keys.RETURN)
    print("Logged in")
    niceCountDown(5)
    # check if cookies asking
    iframes = driver.find_elements_by_tag_name("iframe")
    if iframes:
        print("Accepting cookies")
        driver.switch_to.frame(iframes[0])
        niceCountDown(5)
        # <a class="call" tabindex="0" role="button">Accepter et continuer</a>
        try:
            e = driver.find_element_by_partial_link_text("Accepter")
            e.click()
        except:
            print("No button Accepter")

    driver.switch_to.parent_frame()
    CURRENTDRIVER=driver
    try:
        yield driver
    finally:
        if quit_at_end:
            driver.quit()

def testFamilyDepth():
    with getFamilySearchDriver() as driver:
        print("Going to person")
        driver.get("https://www.familysearch.org/tree/person")

        niceCountDown(10)

        print("Importing recursive-search.js")
        with open(os.path.join(JSFOLDER, "recursive-search.js"), "r") as fin:
            content = fin.read()
        #driver.execute_script()
        print("Testing family-depth.js")
        with open(os.path.join(JSFOLDER, "family-depth.js"), "r") as fin:
            print("result:", driver.execute_script(content + fin.read()))

        # how to recuperate asynchronous results?
        while True:
            niceCountDown(2)
            result = driver.execute_script("return window.familydepthresult;")
            print("Still processing: ", result["processing"], "Current:", len(result))
            if not result["processing"]:
                break
        
        for k, v in sorted(result.items()):
            print(k, ":", len(v) if hasattr(v, '__len__') else v)

def niceCountDown(t, step=1):  # in seconds
    pad_str = ' ' * len('%d' % t)
    for i in range(t, 0, -step):
        sys.stdout.write(f"{i}{pad_str}\r")
        sys.stdout.flush()
        time.sleep(step)

def goTo(driver, identifier):
    """Go to a specific page of Family search"""
    driver.get(f"https://www.familysearch.org/tree/person/details/{identifier}")

def getAttributes(driver, element):
    """Return all attributes of an element"""
    attrs = driver.execute_script('var items = {}; for (index = 0; index < arguments[0].attributes.length; ++index) { items[arguments[0].attributes[index].name] = arguments[0].attributes[index].value }; return items;', element)
    return attrs

def selectThroughSR(driver, *selectors, analyseError=True, onlyTry=False):
    # select element through shadow roots
    try:
        script = "var el = document;\n"
        for selector in selectors:
            script += 'el = el.querySelector("%s"); if (el.shadowRoot) el = el.shadowRoot;\n' % selector;
        if not onlyTry:
            script += "return el;"
        #print(script)
        return driver.execute_script(script)
    except Exception as err:
        if analyseError:
            for i in range(1, len(selectors)+1):
                try:
                    selectThroughSR(driver, *selectors[:i], analyseError=False, onlyTry=True)
                except:
                    raise Exception("Error for {}".format(selectors[:i]))
                    
        else:
            raise

def familySearchRecursive(driver, idfrom, **kwargs):
    processed = kwargs.get("processed", {})
    # TODO
    

def readDetailsPageInfo(driver):
    """Shows how to fetch information"""
    url = driver.current_url
    identifier = url.split("/")[-1]
    print("Reading information about", identifier)
    nameel = selectThroughSR(driver, "fs-person-page",
                           "fs-tree-person-details", 
                           "fs-tree-person-vitals", 
                           "fs-tree-conclusion", 
                           "div.display-name")
    print("Name:", nameel.text)
    bdateel = selectThroughSR(driver, "fs-person-page",
                           "fs-tree-person-details", 
                           "fs-tree-person-vitals", 
                           "fs-tree-conclusion", 
                           "div.display-date",
                            "fs-more-less", "span")
    print("Birthdate:", bdateel.text) # FIXME: doesn't work, empty

    for i in range(1,3):
        # TODO: only the first couple is checked
        spouse2el = selectThroughSR(driver, "fs-person-page",
                               "fs-tree-person-details", 
                               "fs-tree-person-family", 
                               "fs-family-members", 
                               "fs-family-members-block",
                               "fs-family-members-couple",
                               "#spouse%s-display" % i)
        idsp = spouse2el.get_attribute("destination").split("/")[-1]
        if idsp == identifier:
            continue
        print("Spouse:", spouse2el.get_attribute("destination").split("/")[-1],
              "female" if "female" in spouse2el.get_attribute("class") else "male")
        print(spouse2el.find_element_by_id("person-name-link").text)

    # TODO: get children

    for i in range(1,3):
        parentel = selectThroughSR(driver, "fs-person-page",
                           "fs-tree-person-details", 
                           "fs-tree-person-family", 
                           "fs-family-members", 
                           "ul#parents",
                           "fs-family-members-block",
                           "fs-family-members-couple",
                           "#spouse%s-display" % i)
        print("Parent %s:" % i, parentel.get_attribute("destination").split("/")[-1],
              "female" if "female" in parentel.get_attribute("class") else "male")
        print("  ", parentel.find_element_by_id("person-name-link").text)

def testBirthdays():
    with getFamilySearchDriver() as driver:
        goTo(driver, "")
        # go to grand parent
        for i in range(2):
            parentid = None
            badcountdown = 5
            while parentid is None:
                time.sleep(1)
                try:
                    parentel = selectThroughSR(driver, "fs-person-page",
                               "fs-tree-person-details", 
                               "fs-tree-person-family", 
                               "fs-family-members", 
                               "ul#parents",
                               "fs-family-members-block",
                               "fs-family-members-couple",
                               "#spouse1-display", analyseError=False)
                    parentid = parentel.get_attribute("destination").split("/")[-1]
                except JavascriptException as err:
                    print("Page not loaded...", repr(err))
                    # not loaded yet
                    pass
                except AttributeError as err:
                    print("Page seems loaded but...", repr(err))
                    badcountdown -= 1
                    if badcountdown < 0:
                        readDetailsPageInfo(driver)
                        raise
                    # not loaded yet
                    pass
                
            print("Going to", parentid, parentel.find_element_by_id("person-name-link").text)
            goTo(driver, parentid)
        print("Importing recursive-search.js")
        with open(os.path.join(JSFOLDER, "recursive-search.js"), "r") as fin:
            content = fin.read()
        #driver.execute_script()
        print("Testing family-birthdays.js")
        home = os.environ.get("HOME")
        home = home if home else os.environ.get("USERPROFILE")
        downloaddir = os.path.join(home, "Downloads")
        if not os.path.exists(downloaddir):
            downloaddir = os.path.join(home, "Téléchargemebts")
        if not os.path.exists(downloaddir):
            print("Inpossible to detect download dir.")
            return
        print("Using download dir:", downloaddir)
        expectedfile = os.path.join(downloaddir, "anniversaires.html")
        if os.path.exists(expectedfile):
            oldfile = expectedfile + "_old"
            while os.path.exists(oldfile):
                oldfile += str(random.randint(0,9))
            os.rename(expectedfile, oldfile)
            print("Renamed", expectedfile, "to", oldfile)
        with open(os.path.join(JSFOLDER, "family-birthdays.js"), "r", encoding="utf-8") as fin:
            print("result:", driver.execute_script(content + fin.read()))
        while not os.path.exists(expectedfile):
            print("Waiting for", expectedfile)
            niceCountDown(15)
        print("found!")


if __name__ == '__main__':
    #testFamilyDepth()
    testBirthdays()
    '''with getFamilySearchDriver(False) as driver:
        print("driver loaded")
        goTo(driver, "")
        niceCountDown(15)
        readDetailsPageInfo(driver)#'''
