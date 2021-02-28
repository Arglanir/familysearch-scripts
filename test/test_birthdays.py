from testbase import *


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
        captureConsoleLog(driver)
        with open(os.path.join(JSFOLDER, "recursive-search.js"), "r") as fin:
            content = fin.read()
        # driver.execute_script()
        print("Testing family-birthdays.js")
        home = os.environ.get("HOME")
        home = home if home else os.environ.get("USERPROFILE")
        downloaddir = os.path.join(home, "Downloads")
        if not os.path.exists(downloaddir):
            downloaddir = os.path.join(home, "Téléchargements")
        if not os.path.exists(downloaddir):
            print("Impossible to detect download dir.")
            return
        print("Using download dir:", downloaddir)
        expectedfile = os.path.join(downloaddir, "anniversaires.html")
        if os.path.exists(expectedfile):
            oldfile = expectedfile + "_old"
            while os.path.exists(oldfile):
                oldfile += str(random.randint(0, 9))
            os.rename(expectedfile, oldfile)
            print("Renamed", expectedfile, "to", oldfile)
        with open(os.path.join(JSFOLDER, "family-birthdays.js"), "r", encoding="utf-8") as fin:
            print("result:", driver.execute_script(content + fin.read()))
        while not os.path.exists(expectedfile):
            print("Waiting for", expectedfile)
            niceCountDown(15)
        print("File", expectedfile, "found!")
        # for log in getConsoleLog(driver):
        #    print("Log:", log)


if __name__ == '__main__':
    testBirthdays()
