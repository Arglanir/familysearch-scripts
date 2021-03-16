from selenium.common.exceptions import JavascriptException

from testbase import *
import random


def testFamilyDepth():
    with getFamilySearchDriver() as driver:
        print("Going to person")
        driver.get("https://www.familysearch.org/tree/person")

        niceCountDown(10)

        print("Importing recursive-search.js")
        with open(os.path.join(JSFOLDER, "recursive-search.js"), "r") as fin:
            content = fin.read()
        # driver.execute_script()
        print("Testing family-depth.js")
        captureConsoleLog(driver)
        with open(os.path.join(JSFOLDER, "family-depth.js"), "r") as fin:
            print("result:", driver.execute_script(content + fin.read()))

        followLogsUntil(driver, lambda line: "Max depth found" in line[0])

        # how to recuperate asynchronous results?
        while True:
            niceCountDown(2)
            result = driver.execute_script("return window.familydepthresult;")
            print("Still processing: ", result["processing"], "Current:", len(result))
            if not result["processing"]:
                break

        for k, v in sorted(result.items()):
            print(k, ":", len(v) if hasattr(v, '__len__') else v)


if __name__ == '__main__':
    testFamilyDepth()
