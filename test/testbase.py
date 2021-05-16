"""This script aims at testing some javascript modules using python and selenium"""
import contextlib
import os
import subprocess
import sys
import time
import traceback


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
from selenium.webdriver.remote.webelement import WebElement

# from selenium.common.exceptions import JavascriptException

DRIVER = webdriver.Firefox


def DRIVERCREATION_FF():
    from selenium.webdriver.firefox.options import Options
    from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
    capabilities = DesiredCapabilities.CHROME
    capabilities['loggingPrefs'] = {'browser': 'ALL'}
    options = Options()
    # options.headless = True
    profile = webdriver.FirefoxProfile()
    profile.set_preference("browser.helperApps.neverAsk.saveToDisk", "text/plain,text/html")
    profile.set_preference("browser.download.folderLis", "1")
    profile.set_preference("devtools.console.stdout.content", True)
    # for an annoying bug
    profile.set_preference("devtools.selfxss.count", 200)
    profile.set_preference("dom.event.clipboardevents.enabled", False)

    return DRIVER(firefox_profile=profile, options=options#, desired_capabilities=capabilities
     )


def DRIVERCREATION_C():
    from selenium.webdriver.firefox.options import Options
    from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
    capabilities = DesiredCapabilities.CHROME
    capabilities['loggingPrefs'] = {'browser': 'ALL'}
    options = Options()
    # options.headless = True
    # profile = webdriver.FirefoxProfile()
    # profile.set_preference("browser.helperApps.neverAsk.saveToDisk", "text/plain,text/html")
    # profile.set_preference("browser.download.folderLis", "1")
    # profile.set_preference("devtools.console.stdout.content", True)
    return DRIVER(desired_capabilities=capabilities)
DRIVERCREATION = DRIVERCREATION_FF

FILESTOFETCH = {
# https://github.com/mozilla/geckodriver/releases
webdriver.Firefox: "https://github.com/mozilla/geckodriver/releases/download/v0.26.0/geckodriver-v0.26.0-win64.zip",
# https://chromedriver.chromium.org/downloads
webdriver.Chrome: "https://chromedriver.storage.googleapis.com/89.0.4389.23/chromedriver_win32.zip"
}
# installing firefox driver
#   
#   
EXECUTABLEFOLDER = "drivers"
SCRIPTFOLDER = os.path.dirname(os.path.abspath(__file__))
JSFOLDER = os.path.dirname(SCRIPTFOLDER)
CURRENTDRIVER = None


def getCredentials(forWhat=""):
    try:
        username, password = open(os.path.join(SCRIPTFOLDER, "credentials%s.txt" % forWhat)).read().split()[:2]
    except:
        username = input("Type user name for %s:" % ("FamilySearch" if not forWhat else forWhat))
        password = input("Type password:")
        with open(os.path.join(SCRIPTFOLDER, "credentials%s.txt" % forWhat), "w") as fout:
            fout.write(username)
            fout.write(" ")
            fout.write(password)
            fout.write("\n")
    return username, password

@contextlib.contextmanager
def getFamilySearchDriver(quit_at_end=True):
    global CURRENTDRIVER

    driver = getAnyDriver()

    # testing
    print("Getting auth page")
    driver.get("https://www.familysearch.org/auth/familysearch/login?fhf=true&returnUrl=%2F")
    niceCountDown(5)
    elem = driver.find_element_by_id('userName')
    username, password = getCredentials()
    elem.send_keys(username)
    elem = driver.find_element_by_id('password')
    elem.send_keys(password + Keys.RETURN)
    print("Logged in")
    niceCountDown(5)
    # check if cookies asking
    driver.find_element_by_id("truste-consent-button").click()

    CURRENTDRIVER=driver
    try:
        yield driver
    finally:
        if quit_at_end:
            driver.quit()


def getAnyDriver():
    """
    :return: a webdriver ready to be used. Remember to quit() it after use.
    """
    destfoldertopath = os.path.join(SCRIPTFOLDER, EXECUTABLEFOLDER)
    try:
        if os.path.exists(destfoldertopath):
            print("Update PATH")
            os.environ["PATH"] = os.pathsep.join([os.environ["PATH"], destfoldertopath])
        driver = DRIVERCREATION()
    except Exception as e:
        print("Error while starting driver first time...", file=sys.stderr)
        traceback.print_exc()
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
    return driver


def captureConsoleLog(driver: selenium.webdriver.Remote):
    """Start capturing the console.log calls."""
    driver.execute_script("window.alllog = []; var old_console_log = console.log; console.log = function() {window.alllog.push(arguments);old_console_log.apply(null, arguments);};")


def getConsoleLog(driver: selenium.webdriver.Remote, clear:bool=False):
    """
    :param clear: also clears the array
    :return: all logs since the start of the capturing or from last clear."""
    script = "return window.alllog;"
    if clear:
        script = "var temp = window.alllog; window.alllog = []; return temp;"
    return driver.execute_script(script)


def followLogsUntil(driver: selenium.webdriver.Remote, expected: callable or str, timeBetweenChecks=1., displayLogs:bool=True,
                    maxIterations=20):
    """Wait for a log line to appear. Displays the logs in python console too.
    Waits for maximum maxIterations * timeBetweenChecks seconds.
    :param driver: a webdriver
    :param expected: a string (checked for equality) or a callable (called on each string argument array)
    :param timeBetweenChecks: time between checks in seconds
    :param displayLogs: whether to display the logs or not
    :return: corresponding line
    :raise: TimeoutError if line not found
    """
    print("Reading logs until", expected)
    for i in range(maxIterations):
        log = getConsoleLog(driver, clear=True) or []
        for line in log:
            if displayLogs:
                print(line)
            if expected(line) if callable(expected) else expected == line[0]:
                return line
        indexline = len(log)
        time.sleep(timeBetweenChecks)
    raise TimeoutError("Already waited for", maxIterations*timeBetweenChecks, "without success.")


def clearConsoleLog(driver: selenium.webdriver.Remote):
    """Clears the remote log storage."""
    return driver.execute_script("window.alllog = [];")


def niceCountDown(t, step=1):  # in seconds
    # but doesn't work in pycharm nor eclipse :-(
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


def setAttribute(driver: selenium.webdriver.Remote, element: WebElement, attribute: str, value: str):
    """Set an attribute value"""
    driver.execute_script("arguments[0].setAttribute(arguments[1], arguments[2]);", element, attribute, value)


def selectThroughSR(driver: selenium.webdriver.Remote, *selectors: str,
                    analyseError: bool = True, onlyTry: bool = False,
                    origin: WebElement = None, allLast: bool = False) -> WebElement:
    """
    Select elements according to the DOM shadow-roots
    :param driver: the driver to use (can be null if origin is given)
    :param selectors: the CSS selectors
        (add ! prefix in order to not go inside the shadow-root - the last one do not go inside the shadow-root anyway)
    :param analyseError: internal option, allow looking at which element there was an error
    :param onlyTry: do not return anything (use for testing if element chain is present)
    :param origin: (optional) root of the search
    :param allLast: return all end elements found
    :return: the found element(s)
    """
    # select element through shadow roots
    try:
        args = []
        script = "var el = document;\n"
        if origin is not None:
            # origin is specified
            script = "var el = arguments[0];\n"
            args.append(origin)
            if driver is None:
                driver = origin.parent
        for i, selector in enumerate(selectors):
            if i == len(selectors) - 1 and allLast:
                script += 'el = el.querySelectorAll("%s");\n' % selector;
            else:
                if selector.startswith("!"):
                    script += 'el = el.querySelector("%s");\n' % selector[1:];
                else:
                    script += 'el = el.querySelector("%s"); if (el.shadowRoot) el = el.shadowRoot;\n' % selector;
        if not onlyTry:
            script += "return el;"
        #print(script)
        return driver.execute_script(script, *args)
    except Exception as err:
        if analyseError:
            for i in range(1, len(selectors)+1):
                try:
                    selectThroughSR(driver, *selectors[:i], analyseError=False, onlyTry=True, origin=origin)
                except:
                    raise Exception("Error {!r} for {}".format(err, selectors[:i]))
            else:
                # no error, probably because error during "return el;"
                raise
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


def testScript():
    with getFamilySearchDriver() as driver:
        goTo(driver, "L62N-WQ4")
        returned = driver.execute_script(
            '''return {"toto":[1,2,3], "titi":"3,4,5"};''')
        assert returned["toto"] == [1, 2, 3]
        assert returned["titi"] == "3,4,5"

        captureConsoleLog(driver)
        with open(os.path.join(JSFOLDER, "recursive-search.js"), "r") as fin:
            content = fin.read()
        expected = "TestScriptFinished!"
        print("Executing script...")
        driver.execute_script(content + '''
familyTreeRecursive({callback:function({depth=0, from='UNKNOWN', infolocal={}, fullinfo={}, chain=[]}={}){
    console.log("Looking at " + from);
    window.infolocal = infolocal;
    window.fullinfo = fullinfo;
}, from:"L62N-WQ4", depthmax:0, callbackEnd:function(){
    console.log("''' + expected + '''");
}});
''')
        followLogsUntil(driver, expected)
        infolocal = driver.execute_script('''return window.infolocal;''')
        fullinfo = driver.execute_script('''return window.fullinfo;''')

        print(infolocal)
        print(fullinfo)
        create_if_existing = False
        import json
        for name, dico in dict(infolocal=infolocal, fullinfo=fullinfo).items():
            create = create_if_existing
            expectedfilename = os.path.join(JSFOLDER, "test", name + ".reference.json")
            if not os.path.exists(expectedfilename):
                print("File", expectedfilename, "doesn't exist. Creating it...")
                create = True
            if os.path.exists(expectedfilename) and not create:
                with open(expectedfilename, "r") as fin:
                    expected = json.load(fin)
                    assert expected == dico, ("Different dictionary " + name +
                                              ":\n  got:      " + repr(dico) +
                                                "\n  expected: " + repr(expected))
            elif create:
                with open(expectedfilename, "w") as fout:
                    json.dump(dico, fout, sort_keys=True, indent=4)
        print("Both infolocal and fullinfo match.")



if __name__ == '__main__':
    #testFamilyDepth()
    testScript()
    '''with getFamilySearchDriver(False) as driver:
        print("driver loaded")
        goTo(driver, "")
        niceCountDown(15)
        readDetailsPageInfo(driver)#'''
