/* Text tag micro components
*  Try these default styles first
*  Always handle alignment, margins, padding, in parent
*  Overide default clases some other way, they do not always overide, maybe overwrite other classes? Inlne styles is not an option becaue of media query issues (no responsive inline styles). 
alignment classes (? Should these be handled by paretn like in text block)
* In Sync with tailwind 06/22/2023
* In Sync with prismaMaterializeImageCompoenent 06/22/2023
*/

import { GetSettings } from "@/lib/GetSettings.js";

export function GetElement(props) {
    /**Upgrade from Standard Element, greater cohesion wth GetSettings */
    let { Settings, Style, TextStyle, ElementProps } = GetSettings(props, "Element", props.data.tag);
    let Children = cleanChildren()//Don't render null children
    //console.log('props.children',props.children) 
    //console.log('Children',Children) 
    return (/**ideal system */
        <>
            {props.data.href && !(props.data.tag == 'a') &&
                <a {...ElementProps}>
                    <props.data.tag style={TextStyle} id={Settings.innerID} type={props?.data?.type} scheme={Settings?.scheme}>
                        {props.data?.text}
                        {/* || "Element" */}
                        {Children}
                    </props.data.tag>
                </a>
            }
            {props.data.tag === 'a' &&
                <a {...ElementProps} type={props?.data?.type} scheme={Settings?.scheme}>
                    {props.data?.text}
                    {/* || "Element" */}
                    {Children}
                </a>
            }
            {!props.data.href && props.data.tag != 'a' &&
                <props.data.tag onClick={props.onclick ? props.onclick : null} style={TextStyle} id={Settings.id} type={props?.data?.type}scheme={Settings?.scheme}>
                    {props.data?.text}
                    {/* || "Element" */}
                    {Children}
                </props.data.tag>
            }
        </>
    )
    function cleanChildren() {
        if (props?.children?.$$typeof) { return props.children }

        let acceptableChildren = []
        if (props.children && typeof (props.children) === 'object') {
            for (let [index, child] of Object.entries(props.children)) {
                if (typeof (child) === 'object') {
                    acceptableChildren.push(child)
                }
            }
        }
        if (acceptableChildren.length > 0) {
            return acceptableChildren
        }
        else {
            return null
        }
    }
}