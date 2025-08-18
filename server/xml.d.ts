/**
 * 代表一个同时包含属性和文本内容的 XML 元素
 * 这是 xml2js 的一种常见输出格式
 */
interface XmlElementWithAttributes<T> {
  /**
   * 属性对象，键是属性名，值是属性值
   * @example { isPermaLink: 'false' }
   */
  $: T
  /**
   * 元素的文本内容
   */
  _: string
}

/**
 * 代表由 xml2js 解析后的 <item> 元素
 */
export interface XmlJsRssItem {
  title: string[]
  link: string[]
  description: string[]
  pubDate?: string[]
  author?: string[]
  category?: string[]
  comments?: string[]
  enclosure?: {
    $: {
      url: string
      length: string // 注意：XML 属性值通常被解析为字符串
      type: string
    }
  }[]
  torrent?: {
    link: string
    contentLength: string
    pubDate: string
  }[]
  /**
   * guid 可以是简单字符串，也可以是带属性的对象
   */
  guid: (string | XmlElementWithAttributes<{ isPermaLink?: 'true' | 'false' }>)[]
}

/**
 * 代表由 xml2js 解析后的 <channel> 元素
 */
export interface XmlJsRssChannel {
  title: string[]
  link: string[]
  description: string[]
  language?: string[]
  copyright?: string[]
  lastBuildDate?: string[]
  item: XmlJsRssItem[] // item 列表
  image?: {
    url: string[]
    title: string[]
    link: string[]
  }[]
}

/**
 * 代表由 xml2js 从 RSS XML 解析出来的完整对象结构
 */
export interface XmlJsRssRoot {
  rss: {
    /**
     * RSS 版本等属性存储在 '$' 对象中
     */
    $: {
      version: string
      [key: string]: string // 允许多个 xmlns 等其他属性
    }
    channel: XmlJsRssChannel[]
  }
}
